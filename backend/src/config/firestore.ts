import { Firestore } from '@google-cloud/firestore';

export const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

export const collections = {
  users: 'users',
  events: 'events',
  notifications: 'notifications',
  settings: 'settings',
} as const;

export const firestoreSchema = {
  users: {
    fields: {
      connpassId: 'string',
      lineUserId: 'string',
      reminderSettings: {
        enabled: 'boolean',
        timings: 'array',
        eventTypes: 'array',
      },
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
    },
    indexes: [
      { fields: ['connpassId'] },
      { fields: ['lineUserId'] },
    ],
  },
  events: {
    fields: {
      id: 'number',
      title: 'string',
      description: 'string',
      startDate: 'timestamp',
      endDate: 'timestamp',
      location: 'string',
      eventUrl: 'string',
      ownerNickname: 'string',
      limit: 'number',
      accepted: 'number',
      waiting: 'number',
      tags: 'array',
      createdAt: 'timestamp',
      updatedAt: 'timestamp',
    },
    indexes: [
      { fields: ['startDate'] },
      { fields: ['tags'] },
      { fields: ['ownerNickname'] },
    ],
  },
  notifications: {
    fields: {
      userId: 'string',
      eventId: 'number',
      notificationType: 'string',
      sentAt: 'timestamp',
      status: 'string',
      errorMessage: 'string',
    },
    indexes: [
      { fields: ['userId'] },
      { fields: ['eventId'] },
      { fields: ['sentAt'] },
      { fields: ['status'] },
    ],
  },
};