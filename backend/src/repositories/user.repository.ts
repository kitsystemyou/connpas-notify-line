import { db, collections } from '../config/firestore';
import { User, ReminderSettings } from '../models/types';
import { Logger } from '../utils/logger';

export class UserRepository {
  private readonly logger = new Logger('UserRepository');

  async findById(id: string): Promise<User | null> {
    try {
      const doc = await db.collection(collections.users).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      this.logger.error('Failed to find user by ID', { id, error });
      throw error;
    }
  }

  async findByConnpassId(connpassId: string): Promise<User | null> {
    try {
      const snapshot = await db.collection(collections.users)
        .where('connpassId', '==', connpassId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      this.logger.error('Failed to find user by Connpass ID', { connpassId, error });
      throw error;
    }
  }

  async findByLineUserId(lineUserId: string): Promise<User | null> {
    try {
      const snapshot = await db.collection(collections.users)
        .where('lineUserId', '==', lineUserId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      this.logger.error('Failed to find user by LINE user ID', { lineUserId, error });
      throw error;
    }
  }

  async create(user: Omit<User, 'id'>): Promise<User> {
    try {
      const docRef = await db.collection(collections.users).add({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      const createdUser = { id: docRef.id, ...user };
      this.logger.info('User created successfully', { userId: docRef.id });
      return createdUser;
    } catch (error) {
      this.logger.error('Failed to create user', { error });
      throw error;
    }
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    try {
      await db.collection(collections.users).doc(id).update({
        ...updates,
        updatedAt: new Date(),
      });
      
      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new Error('User not found after update');
      }
      
      this.logger.info('User updated successfully', { userId: id });
      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user', { userId: id, error });
      throw error;
    }
  }

  async updateReminderSettings(id: string, settings: ReminderSettings): Promise<User> {
    return this.update(id, { reminderSettings: settings });
  }

  async delete(id: string): Promise<void> {
    try {
      await db.collection(collections.users).doc(id).delete();
      this.logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      this.logger.error('Failed to delete user', { userId: id, error });
      throw error;
    }
  }

  async findUsersWithRemindersEnabled(): Promise<User[]> {
    try {
      const snapshot = await db.collection(collections.users)
        .where('reminderSettings.enabled', '==', true)
        .get();
      
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      this.logger.info('Found users with reminders enabled', { count: users.length });
      return users;
    } catch (error) {
      this.logger.error('Failed to find users with reminders enabled', { error });
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const doc = await db.collection(collections.users).doc(id).get();
      return doc.exists;
    } catch (error) {
      this.logger.error('Failed to check user existence', { userId: id, error });
      throw error;
    }
  }
}