import { ConnpassService } from './connpass.service';
import { LineService } from './line.service';
import { UserRepository } from '../repositories/user.repository';
import { EventRepository } from '../repositories/event.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { ConnpassEvent, User, ReminderTiming } from '../models/types';
import { Logger } from '../utils/logger';
import moment from 'moment-timezone';

export class ReminderService {
  private readonly connpassService = new ConnpassService();
  private readonly lineService = new LineService();
  private readonly userRepository = new UserRepository();
  private readonly eventRepository = new EventRepository();
  private readonly notificationRepository = new NotificationRepository();
  private readonly logger = new Logger('ReminderService');

  async processScheduledReminders(): Promise<void> {
    try {
      this.logger.info('Starting scheduled reminder processing');
      
      // 1. Get all users with reminders enabled
      const users = await this.userRepository.findUsersWithRemindersEnabled();
      
      if (users.length === 0) {
        this.logger.info('No users with reminders enabled');
        return;
      }

      // 2. Fetch upcoming events from Connpass
      const events = await this.connpassService.getUpcomingEvents(7); // Next 7 days
      
      if (events.length === 0) {
        this.logger.info('No upcoming events found');
        return;
      }

      // 3. Store/update events in Firestore
      await this.eventRepository.bulkUpsert(events);

      // 4. Process reminders for each user
      const reminderPromises = users.map(user => this.processUserReminders(user, events));
      await Promise.all(reminderPromises);

      this.logger.info('Scheduled reminder processing completed', {
        usersProcessed: users.length,
        eventsProcessed: events.length,
      });
    } catch (error) {
      this.logger.error('Failed to process scheduled reminders', error);
      throw error;
    }
  }

  private async processUserReminders(user: User, events: ConnpassEvent[]): Promise<void> {
    try {
      const now = moment().tz('Asia/Tokyo');
      
      for (const event of events) {
        const eventStart = moment(event.startDate).tz('Asia/Tokyo');
        
        // Check each reminder timing
        for (const timing of user.reminderSettings.timings) {
          const reminderTime = this.calculateReminderTime(eventStart, timing);
          
          if (this.shouldSendReminder(now, reminderTime)) {
            await this.sendReminder(user, event, timing);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process user reminders', { userId: user.id, error });
    }
  }

  private calculateReminderTime(eventStart: moment.Moment, timing: ReminderTiming): moment.Moment {
    const reminderTime = eventStart.clone();
    
    switch (timing.unit) {
      case 'minutes':
        reminderTime.subtract(timing.value, 'minutes');
        break;
      case 'hours':
        reminderTime.subtract(timing.value, 'hours');
        break;
      case 'days':
        reminderTime.subtract(timing.value, 'days');
        break;
    }
    
    return reminderTime;
  }

  private shouldSendReminder(now: moment.Moment, reminderTime: moment.Moment): boolean {
    const diffMinutes = Math.abs(now.diff(reminderTime, 'minutes'));
    return diffMinutes <= 30; // Send if within 30 minutes of reminder time
  }

  private async sendReminder(user: User, event: ConnpassEvent, timing: ReminderTiming): Promise<void> {
    try {
      const reminderType = this.getReminderType(timing);
      
      // Check if reminder was already sent
      const existingNotification = await this.notificationRepository.findRecentNotification(
        user.id,
        event.id,
        reminderType
      );
      
      if (existingNotification && existingNotification.status === 'sent') {
        this.logger.debug('Reminder already sent', { userId: user.id, eventId: event.id, reminderType });
        return;
      }

      // Create notification log
      const notification = await this.notificationRepository.create({
        userId: user.id,
        eventId: event.id,
        notificationType: 'reminder',
        sentAt: new Date(),
        status: 'pending',
      });

      try {
        // Send LINE message
        await this.lineService.sendReminderMessage(user.lineUserId, event, reminderType);
        
        // Update notification status
        await this.notificationRepository.updateStatus(notification.id, 'sent');
        
        this.logger.info('Reminder sent successfully', {
          userId: user.id,
          eventId: event.id,
          reminderType,
        });
      } catch (error) {
        // Update notification status as failed
        await this.notificationRepository.updateStatus(
          notification.id,
          'failed',
          (error as Error).message
        );
        
        this.logger.error('Failed to send reminder', {
          userId: user.id,
          eventId: event.id,
          reminderType,
          error,
        });
      }
    } catch (error) {
      this.logger.error('Failed to process reminder', { userId: user.id, eventId: event.id, error });
    }
  }

  private getReminderType(timing: ReminderTiming): string {
    if (timing.unit === 'days' && timing.value === 1) {
      return '1day';
    } else if (timing.unit === 'hours' && timing.value === 3) {
      return '3hours';
    } else if (timing.unit === 'hours' && timing.value === 1) {
      return '1hour';
    } else if (timing.unit === 'minutes' && timing.value === 30) {
      return '30minutes';
    }
    return `${timing.value}${timing.unit}`;
  }

  async handleLineWebhook(webhookData: any): Promise<void> {
    try {
      this.logger.info('Processing LINE webhook', { webhookData });
      
      const { events } = webhookData;
      
      for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
          await this.handleTextMessage(event);
        } else if (event.type === 'follow') {
          await this.handleFollowEvent(event);
        } else if (event.type === 'unfollow') {
          await this.handleUnfollowEvent(event);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle LINE webhook', { error });
      throw error;
    }
  }

  private async handleTextMessage(event: any): Promise<void> {
    const { source, message } = event;
    const text = message.text.toLowerCase();
    
    if (text.includes('登録') || text.includes('register')) {
      await this.handleRegistration(source.userId);
    } else if (text.includes('設定') || text.includes('settings')) {
      await this.handleSettings(source.userId);
    } else if (text.includes('ヘルプ') || text.includes('help')) {
      await this.handleHelp(source.userId);
    }
  }

  private async handleFollowEvent(event: any): Promise<void> {
    const { source } = event;
    await this.lineService.sendTextMessage(
      source.userId,
      'Connpassリマインダーへようこそ！\n\n「登録」と送信して、アカウントを連携してください。'
    );
  }

  private async handleUnfollowEvent(event: any): Promise<void> {
    const { source } = event;
    
    // Find and deactivate user
    const user = await this.userRepository.findByLineUserId(source.userId);
    if (user) {
      await this.userRepository.updateReminderSettings(user.id, {
        ...user.reminderSettings,
        enabled: false,
      });
    }
  }

  private async handleRegistration(lineUserId: string): Promise<void> {
    try {
      const existingUser = await this.userRepository.findByLineUserId(lineUserId);
      
      if (existingUser) {
        await this.lineService.sendTextMessage(
          lineUserId,
          '既に登録済みです。設定を変更するには「設定」と送信してください。'
        );
        return;
      }

      // For now, we'll create a user with placeholder Connpass ID
      // In a real implementation, this would involve OAuth or manual ID input
      const user = await this.userRepository.create({
        connpassId: 'placeholder',
        lineUserId,
        reminderSettings: {
          enabled: true,
          timings: [
            { value: 1, unit: 'days' },
            { value: 3, unit: 'hours' },
          ],
          eventTypes: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.lineService.sendTextMessage(
        lineUserId,
        '登録が完了しました！\n\nConnpassのイベントリマインダーを開始します。\n設定を変更するには「設定」と送信してください。'
      );
    } catch (error) {
      this.logger.error('Failed to handle registration', { lineUserId, error });
      await this.lineService.sendTextMessage(
        lineUserId,
        '登録に失敗しました。しばらく時間をおいてから再度お試しください。'
      );
    }
  }

  private async handleSettings(lineUserId: string): Promise<void> {
    try {
      const user = await this.userRepository.findByLineUserId(lineUserId);
      
      if (!user) {
        await this.lineService.sendTextMessage(
          lineUserId,
          '登録されていません。まず「登録」と送信してアカウントを作成してください。'
        );
        return;
      }

      const timings = user.reminderSettings.timings
        .map(t => `${t.value}${t.unit === 'days' ? '日' : t.unit === 'hours' ? '時間' : '分'}前`)
        .join(', ');

      await this.lineService.sendTextMessage(
        lineUserId,
        `現在の設定:\n\n通知: ${user.reminderSettings.enabled ? '有効' : '無効'}\n通知タイミング: ${timings}\n\n設定変更はWebインターフェースから行えます。`
      );
    } catch (error) {
      this.logger.error('Failed to handle settings', { lineUserId, error });
    }
  }

  private async handleHelp(lineUserId: string): Promise<void> {
    const helpText = `Connpassリマインダーの使い方:

📝 登録: アカウントを連携
⚙️ 設定: 現在の設定を確認
❓ ヘルプ: このメッセージを表示

リマインダーは自動的に送信されます。
設定変更はWebインターフェースから行えます。`;

    await this.lineService.sendTextMessage(lineUserId, helpText);
  }

  async testConnpassApi(): Promise<any> {
    try {
      const events = await this.connpassService.getUpcomingEvents(1);
      return {
        success: true,
        eventsFound: events.length,
        sample: events[0] || null,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}