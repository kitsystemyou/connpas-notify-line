import { Client, ClientConfig, Message, FlexMessage } from '@line/bot-sdk';
import { ConnpassEvent, LineMessage } from '../models/types';
import { Logger } from '../utils/logger';
import { SecretManagerService } from './secret-manager.service';

export class LineService {
  private client!: Client;
  private readonly logger = new Logger('LineService');
  private readonly secretManager = new SecretManagerService();

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const channelAccessToken = await this.secretManager.getSecret('line-channel-access-token');
      
      const config: ClientConfig = {
        channelAccessToken,
      };

      this.client = new Client(config);
      this.logger.info('LINE client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LINE client', error);
      throw error;
    }
  }

  async sendReminderMessage(userId: string, event: ConnpassEvent, reminderType: string): Promise<void> {
    try {
      const message = this.createReminderMessage(event, reminderType);
      await this.client.pushMessage(userId, message);
      
      this.logger.info('Reminder message sent successfully', {
        userId,
        eventId: event.id,
        reminderType,
      });
    } catch (error) {
      this.logger.error('Failed to send reminder message', { userId, eventId: event.id, error });
      throw error;
    }
  }

  async sendTextMessage(userId: string, text: string): Promise<void> {
    try {
      const message: Message = {
        type: 'text',
        text,
      };

      await this.client.pushMessage(userId, message);
      this.logger.info('Text message sent successfully', { userId });
    } catch (error) {
      this.logger.error('Failed to send text message', { userId, error });
      throw error;
    }
  }

  private createReminderMessage(event: ConnpassEvent, reminderType: string): FlexMessage {
    const reminderText = this.getReminderText(reminderType);
    const eventDate = event.startDate.toLocaleDateString('ja-JP');
    const eventTime = event.startDate.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return {
      type: 'flex',
      altText: `${reminderText}: ${event.title}`,
      contents: {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: reminderText,
              weight: 'bold',
              color: '#1DB446',
              size: 'sm',
            },
            {
              type: 'text',
              text: event.title,
              weight: 'bold',
              size: 'xl',
              wrap: true,
            },
          ],
          spacing: 'md',
          paddingAll: 'lg',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: '日時',
                      size: 'sm',
                      color: '#666666',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${eventDate} ${eventTime}`,
                      size: 'sm',
                      color: '#333333',
                      flex: 4,
                      wrap: true,
                    },
                  ],
                  spacing: 'sm',
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: '場所',
                      size: 'sm',
                      color: '#666666',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: event.location,
                      size: 'sm',
                      color: '#333333',
                      flex: 4,
                      wrap: true,
                    },
                  ],
                  spacing: 'sm',
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: '参加者',
                      size: 'sm',
                      color: '#666666',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${event.accepted}/${event.limit}名`,
                      size: 'sm',
                      color: '#333333',
                      flex: 4,
                    },
                  ],
                  spacing: 'sm',
                },
              ],
              spacing: 'md',
            },
          ],
          paddingAll: 'lg',
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'イベントページを開く',
                uri: event.eventUrl,
              },
              style: 'primary',
              color: '#1DB446',
            },
          ],
          paddingAll: 'lg',
        },
      },
    };
  }

  private getReminderText(reminderType: string): string {
    switch (reminderType) {
      case '1day':
        return '明日開催予定のイベントです';
      case '3hours':
        return '3時間後に開催予定のイベントです';
      case '1hour':
        return '1時間後に開催予定のイベントです';
      case '30minutes':
        return '30分後に開催予定のイベントです';
      default:
        return 'イベントのお知らせ';
    }
  }

  async verifyWebhook(signature: string, body: string): Promise<boolean> {
    try {
      // LINE Webhook signature verification would go here
      // For now, we'll just return true
      return true;
    } catch (error) {
      this.logger.error('Webhook verification failed', error);
      return false;
    }
  }
}