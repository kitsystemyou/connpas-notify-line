import axios from 'axios';
import { ConnpassEvent, ConnpassApiResponse } from '../models/types';
import { Logger } from '../utils/logger';

export class ConnpassService {
  private readonly baseUrl = 'https://connpass.com/api/v1/event/';
  private readonly logger = new Logger('ConnpassService');

  async getEvents(params: ConnpassEventParams = {}): Promise<ConnpassEvent[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('count', (params.count || 100).toString());
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && key !== 'count') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await axios.get<ConnpassApiResponse>(
        `${this.baseUrl}?${queryParams.toString()}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'ConnpassLineReminder/1.0',
          },
        }
      );

      this.logger.info('Connpass API response received', {
        resultsReturned: response.data.results_returned,
        resultsAvailable: response.data.results_available,
      });

      return response.data.events.map(this.transformEvent);
    } catch (error) {
      this.logger.error('Failed to fetch events from Connpass API', error);
      throw new Error('Failed to fetch events from Connpass API');
    }
  }

  async getEventById(eventId: number): Promise<ConnpassEvent | null> {
    try {
      const events = await this.getEvents({ event_id: eventId.toString() });
      return events.length > 0 ? events[0] : null;
    } catch (error) {
      this.logger.error('Failed to fetch event by ID', { eventId, error });
      return null;
    }
  }

  async getUpcomingEvents(days: number = 30): Promise<ConnpassEvent[]> {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return this.getEvents({
      ymd: now.toISOString().split('T')[0].replace(/-/g, ''),
      ymde: endDate.toISOString().split('T')[0].replace(/-/g, ''),
      order: '1', // 開催日時順
    });
  }

  async getEventsByKeyword(keyword: string, limit: number = 50): Promise<ConnpassEvent[]> {
    return this.getEvents({
      keyword,
      count: limit,
      order: '1',
    });
  }

  private transformEvent(event: any): ConnpassEvent {
    return {
      id: event.event_id,
      title: event.title,
      description: event.description || '',
      startDate: new Date(event.started_at),
      endDate: new Date(event.ended_at),
      location: event.place || 'オンライン',
      eventUrl: event.event_url,
      ownerNickname: event.owner_nickname,
      limit: event.limit || 0,
      accepted: event.accepted || 0,
      waiting: event.waiting || 0,
      tags: event.series?.title ? [event.series.title] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export interface ConnpassEventParams {
  event_id?: string;
  keyword?: string;
  keyword_or?: string;
  ym?: string;
  ymd?: string;
  ymde?: string;
  nickname?: string;
  owner_nickname?: string;
  series_id?: string;
  start?: number;
  count?: number;
  order?: string;
  format?: string;
}