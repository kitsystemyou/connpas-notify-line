export interface User {
  id: string;
  connpassId: string;
  lineUserId: string;
  reminderSettings: ReminderSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderSettings {
  enabled: boolean;
  timings: ReminderTiming[];
  eventTypes: string[];
}

export interface ReminderTiming {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface ConnpassEvent {
  id: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  eventUrl: string;
  ownerNickname: string;
  limit: number;
  accepted: number;
  waiting: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  id: string;
  userId: string;
  eventId: number;
  notificationType: 'reminder' | 'update' | 'cancellation';
  sentAt: Date;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
}

export interface LineMessage {
  type: 'text' | 'flex';
  text?: string;
  altText?: string;
  contents?: any;
}

export interface ConnpassApiResponse {
  events: ConnpassEvent[];
  results_returned: number;
  results_available: number;
  results_start: number;
}