import { db, collections } from '../config/firestore';
import { NotificationLog } from '../models/types';
import { Logger } from '../utils/logger';

export class NotificationRepository {
  private readonly logger = new Logger('NotificationRepository');

  async create(notification: Omit<NotificationLog, 'id'>): Promise<NotificationLog> {
    try {
      const docRef = await db.collection(collections.notifications).add({
        ...notification,
        sentAt: new Date(),
      });
      
      const createdNotification = { id: docRef.id, ...notification };
      this.logger.info('Notification log created', { notificationId: docRef.id });
      return createdNotification;
    } catch (error) {
      this.logger.error('Failed to create notification log', { error });
      throw error;
    }
  }

  async findById(id: string): Promise<NotificationLog | null> {
    try {
      const doc = await db.collection(collections.notifications).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() } as NotificationLog;
    } catch (error) {
      this.logger.error('Failed to find notification by ID', { id, error });
      throw error;
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<NotificationLog[]> {
    try {
      const snapshot = await db.collection(collections.notifications)
        .where('userId', '==', userId)
        .orderBy('sentAt', 'desc')
        .limit(limit)
        .get();
      
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as NotificationLog));
      
      this.logger.info('Found notifications by user ID', { userId, count: notifications.length });
      return notifications;
    } catch (error) {
      this.logger.error('Failed to find notifications by user ID', { userId, error });
      throw error;
    }
  }

  async findByEventId(eventId: number): Promise<NotificationLog[]> {
    try {
      const snapshot = await db.collection(collections.notifications)
        .where('eventId', '==', eventId)
        .orderBy('sentAt', 'desc')
        .get();
      
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as NotificationLog));
      
      this.logger.info('Found notifications by event ID', { eventId, count: notifications.length });
      return notifications;
    } catch (error) {
      this.logger.error('Failed to find notifications by event ID', { eventId, error });
      throw error;
    }
  }

  async findRecentNotification(userId: string, eventId: number, notificationType: string): Promise<NotificationLog | null> {
    try {
      const snapshot = await db.collection(collections.notifications)
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .where('notificationType', '==', notificationType)
        .orderBy('sentAt', 'desc')
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as NotificationLog;
    } catch (error) {
      this.logger.error('Failed to find recent notification', { userId, eventId, notificationType, error });
      throw error;
    }
  }

  async updateStatus(id: string, status: 'sent' | 'failed' | 'pending', errorMessage?: string): Promise<void> {
    try {
      const updates: any = { status };
      if (errorMessage) {
        updates.errorMessage = errorMessage;
      }
      
      await db.collection(collections.notifications).doc(id).update(updates);
      this.logger.info('Notification status updated', { notificationId: id, status });
    } catch (error) {
      this.logger.error('Failed to update notification status', { notificationId: id, status, error });
      throw error;
    }
  }

  async findFailedNotifications(limit: number = 100): Promise<NotificationLog[]> {
    try {
      const snapshot = await db.collection(collections.notifications)
        .where('status', '==', 'failed')
        .orderBy('sentAt', 'desc')
        .limit(limit)
        .get();
      
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as NotificationLog));
      
      this.logger.info('Found failed notifications', { count: notifications.length });
      return notifications;
    } catch (error) {
      this.logger.error('Failed to find failed notifications', { error });
      throw error;
    }
  }

  async findNotificationsByDateRange(startDate: Date, endDate: Date): Promise<NotificationLog[]> {
    try {
      const snapshot = await db.collection(collections.notifications)
        .where('sentAt', '>=', startDate)
        .where('sentAt', '<=', endDate)
        .orderBy('sentAt', 'desc')
        .get();
      
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as NotificationLog));
      
      this.logger.info('Found notifications by date range', { count: notifications.length });
      return notifications;
    } catch (error) {
      this.logger.error('Failed to find notifications by date range', { error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.collection(collections.notifications).doc(id).delete();
      this.logger.info('Notification deleted', { notificationId: id });
    } catch (error) {
      this.logger.error('Failed to delete notification', { notificationId: id, error });
      throw error;
    }
  }

  async getNotificationStats(userId?: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      let query = db.collection(collections.notifications);
      
      if (userId) {
        query = query.where('userId', '==', userId);
      }
      
      const snapshot = await query.get();
      
      const stats = {
        total: snapshot.size,
        sent: 0,
        failed: 0,
        pending: 0,
      };
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as NotificationLog;
        stats[data.status]++;
      });
      
      this.logger.info('Notification stats retrieved', { userId, stats });
      return stats;
    } catch (error) {
      this.logger.error('Failed to get notification stats', { userId, error });
      throw error;
    }
  }
}