import { db, collections } from '../config/firestore';
import { ConnpassEvent } from '../models/types';
import { Logger } from '../utils/logger';

export class EventRepository {
  private readonly logger = new Logger('EventRepository');

  async findById(id: number): Promise<ConnpassEvent | null> {
    try {
      const doc = await db.collection(collections.events).doc(id.toString()).get();
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      return { id: parseInt(doc.id), ...data } as ConnpassEvent;
    } catch (error) {
      this.logger.error('Failed to find event by ID', { id, error });
      throw error;
    }
  }

  async create(event: ConnpassEvent): Promise<ConnpassEvent> {
    try {
      await db.collection(collections.events).doc(event.id.toString()).set({
        ...event,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      this.logger.info('Event created successfully', { eventId: event.id });
      return event;
    } catch (error) {
      this.logger.error('Failed to create event', { eventId: event.id, error });
      throw error;
    }
  }

  async update(id: number, updates: Partial<ConnpassEvent>): Promise<ConnpassEvent> {
    try {
      await db.collection(collections.events).doc(id.toString()).update({
        ...updates,
        updatedAt: new Date(),
      });
      
      const updatedEvent = await this.findById(id);
      if (!updatedEvent) {
        throw new Error('Event not found after update');
      }
      
      this.logger.info('Event updated successfully', { eventId: id });
      return updatedEvent;
    } catch (error) {
      this.logger.error('Failed to update event', { eventId: id, error });
      throw error;
    }
  }

  async upsert(event: ConnpassEvent): Promise<ConnpassEvent> {
    try {
      const existing = await this.findById(event.id);
      if (existing) {
        return this.update(event.id, event);
      } else {
        return this.create(event);
      }
    } catch (error) {
      this.logger.error('Failed to upsert event', { eventId: event.id, error });
      throw error;
    }
  }

  async findUpcomingEvents(fromDate: Date, toDate: Date): Promise<ConnpassEvent[]> {
    try {
      const snapshot = await db.collection(collections.events)
        .where('startDate', '>=', fromDate)
        .where('startDate', '<=', toDate)
        .orderBy('startDate')
        .get();
      
      const events = snapshot.docs.map(doc => ({ 
        id: parseInt(doc.id), 
        ...doc.data() 
      } as ConnpassEvent));
      
      this.logger.info('Found upcoming events', { count: events.length });
      return events;
    } catch (error) {
      this.logger.error('Failed to find upcoming events', { error });
      throw error;
    }
  }

  async findEventsByIds(eventIds: number[]): Promise<ConnpassEvent[]> {
    try {
      if (eventIds.length === 0) {
        return [];
      }

      const eventPromises = eventIds.map(id => this.findById(id));
      const events = await Promise.all(eventPromises);
      
      return events.filter(event => event !== null) as ConnpassEvent[];
    } catch (error) {
      this.logger.error('Failed to find events by IDs', { eventIds, error });
      throw error;
    }
  }

  async findEventsByKeyword(keyword: string, limit: number = 50): Promise<ConnpassEvent[]> {
    try {
      const snapshot = await db.collection(collections.events)
        .where('title', '>=', keyword)
        .where('title', '<=', keyword + '\uf8ff')
        .limit(limit)
        .get();
      
      const events = snapshot.docs.map(doc => ({ 
        id: parseInt(doc.id), 
        ...doc.data() 
      } as ConnpassEvent));
      
      this.logger.info('Found events by keyword', { keyword, count: events.length });
      return events;
    } catch (error) {
      this.logger.error('Failed to find events by keyword', { keyword, error });
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await db.collection(collections.events).doc(id.toString()).delete();
      this.logger.info('Event deleted successfully', { eventId: id });
    } catch (error) {
      this.logger.error('Failed to delete event', { eventId: id, error });
      throw error;
    }
  }

  async exists(id: number): Promise<boolean> {
    try {
      const doc = await db.collection(collections.events).doc(id.toString()).get();
      return doc.exists;
    } catch (error) {
      this.logger.error('Failed to check event existence', { eventId: id, error });
      throw error;
    }
  }

  async bulkUpsert(events: ConnpassEvent[]): Promise<void> {
    try {
      const batch = db.batch();
      
      events.forEach(event => {
        const docRef = db.collection(collections.events).doc(event.id.toString());
        batch.set(docRef, {
          ...event,
          updatedAt: new Date(),
        }, { merge: true });
      });
      
      await batch.commit();
      this.logger.info('Bulk upsert completed', { count: events.length });
    } catch (error) {
      this.logger.error('Failed to bulk upsert events', { count: events.length, error });
      throw error;
    }
  }
}