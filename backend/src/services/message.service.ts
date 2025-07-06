import { FlexMessage } from '@line/bot-sdk';
import { ConnpassEvent } from '../models/types';
import { Logger } from '../utils/logger';
import moment from 'moment-timezone';

export class MessageService {
  private readonly logger = new Logger('MessageService');

  createReminderFlexMessage(event: ConnpassEvent, reminderType: string): FlexMessage {
    const eventDate = moment(event.startDate).tz('Asia/Tokyo');
    const reminderText = this.getReminderText(reminderType);
    
    return {
      type: 'flex',
      altText: `${reminderText}: ${event.title}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📅 イベントリマインダー',
              weight: 'bold',
              color: '#1DB446',
              size: 'sm',
            },
            {
              type: 'text',
              text: reminderText,
              color: '#666666',
              size: 'xs',
              margin: 'sm',
            },
          ],
          paddingAll: 'lg',
          backgroundColor: '#f8f9fa',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: event.title,
              weight: 'bold',
              size: 'lg',
              wrap: true,
              color: '#333333',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                this.createInfoRow('📅', '日時', eventDate.format('YYYY年M月D日(ddd) HH:mm')),
                this.createInfoRow('📍', '場所', event.location || 'オンライン'),
                this.createInfoRow('👥', '参加者', `${event.accepted}/${event.limit || '∞'}名`),
                this.createInfoRow('👤', '主催者', event.ownerNickname),
              ],
              spacing: 'sm',
              margin: 'md',
            },
            ...(event.description ? [
              {
                type: 'separator' as const,
                margin: 'md',
              },
              {
                type: 'text' as const,
                text: this.truncateText(event.description, 100),
                size: 'sm',
                color: '#666666',
                wrap: true,
                margin: 'md',
              },
            ] : []),
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
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'カレンダーに追加',
                uri: this.createCalendarUrl(event),
              },
              style: 'secondary',
              margin: 'sm',
            },
          ],
          paddingAll: 'lg',
        },
      },
    };
  }

  createEventUpdateMessage(event: ConnpassEvent, updateType: 'updated' | 'cancelled'): FlexMessage {
    const eventDate = moment(event.startDate).tz('Asia/Tokyo');
    const updateText = updateType === 'cancelled' ? '❌ イベントキャンセル' : '🔄 イベント更新';
    
    return {
      type: 'flex',
      altText: `${updateText}: ${event.title}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: updateText,
              weight: 'bold',
              color: updateType === 'cancelled' ? '#FF4444' : '#FF8800',
              size: 'lg',
            },
            {
              type: 'text',
              text: event.title,
              weight: 'bold',
              size: 'md',
              wrap: true,
              color: '#333333',
              margin: 'sm',
            },
          ],
          paddingAll: 'lg',
          backgroundColor: updateType === 'cancelled' ? '#fff5f5' : '#fff8f0',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: updateType === 'cancelled' ? 
                'このイベントはキャンセルされました。' : 
                'このイベントの情報が更新されました。',
              size: 'sm',
              color: '#666666',
              wrap: true,
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                this.createInfoRow('📅', '日時', eventDate.format('YYYY年M月D日(ddd) HH:mm')),
                this.createInfoRow('📍', '場所', event.location || 'オンライン'),
              ],
              spacing: 'sm',
              margin: 'md',
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
                label: '詳細を確認',
                uri: event.eventUrl,
              },
              style: 'primary',
              color: updateType === 'cancelled' ? '#FF4444' : '#FF8800',
            },
          ],
          paddingAll: 'lg',
        },
      },
    };
  }

  createWelcomeMessage(): FlexMessage {
    return {
      type: 'flex',
      altText: 'Connpassリマインダーへようこそ！',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎉 ようこそ！',
              weight: 'bold',
              color: '#1DB446',
              size: 'xl',
            },
            {
              type: 'text',
              text: 'Connpassリマインダー',
              weight: 'bold',
              color: '#333333',
              size: 'lg',
            },
          ],
          paddingAll: 'lg',
          backgroundColor: '#f8f9fa',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'Connpassのイベントリマインダーサービスです。',
              size: 'md',
              color: '#333333',
              wrap: true,
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '📝 「登録」でアカウント連携',
                  size: 'sm',
                  color: '#666666',
                },
                {
                  type: 'text',
                  text: '⚙️ 「設定」で通知設定確認',
                  size: 'sm',
                  color: '#666666',
                },
                {
                  type: 'text',
                  text: '❓ 「ヘルプ」で使い方確認',
                  size: 'sm',
                  color: '#666666',
                },
              ],
              spacing: 'sm',
              margin: 'md',
            },
          ],
          paddingAll: 'lg',
        },
      },
    };
  }

  private createInfoRow(icon: string, label: string, value: string): any {
    return {
      type: 'box',
      layout: 'baseline',
      contents: [
        {
          type: 'text',
          text: icon,
          size: 'sm',
          flex: 1,
        },
        {
          type: 'text',
          text: label,
          size: 'sm',
          color: '#666666',
          flex: 2,
        },
        {
          type: 'text',
          text: value,
          size: 'sm',
          color: '#333333',
          flex: 5,
          wrap: true,
        },
      ],
      spacing: 'sm',
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

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  private createCalendarUrl(event: ConnpassEvent): string {
    const startDate = moment(event.startDate).tz('Asia/Tokyo');
    const endDate = moment(event.endDate).tz('Asia/Tokyo');
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDate.format('YYYYMMDD[T]HHmmss')}/${endDate.format('YYYYMMDD[T]HHmmss')}`,
      location: event.location || '',
      details: `${event.description}\n\n${event.eventUrl}`,
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
}