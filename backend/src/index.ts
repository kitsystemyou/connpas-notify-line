import { functions } from '@google-cloud/functions-framework';
import { Request, Response } from 'express';
import { ReminderService } from './services/reminder.service';
import { Logger } from './utils/logger';

const logger = new Logger('main');

functions.http('connpass-reminder', async (req: Request, res: Response) => {
  try {
    logger.info('Function execution started', { method: req.method, path: req.path });
    
    const reminderService = new ReminderService();
    
    switch (req.method) {
      case 'POST':
        await handlePostRequest(req, res, reminderService);
        break;
      case 'GET':
        await handleGetRequest(req, res, reminderService);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('Function execution failed', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handlePostRequest(req: Request, res: Response, reminderService: ReminderService) {
  const { type } = req.body;
  
  switch (type) {
    case 'scheduled':
      await reminderService.processScheduledReminders();
      res.json({ message: 'Scheduled reminders processed successfully' });
      break;
    case 'webhook':
      await reminderService.handleLineWebhook(req.body);
      res.json({ message: 'Webhook processed successfully' });
      break;
    default:
      res.status(400).json({ error: 'Invalid request type' });
  }
}

async function handleGetRequest(req: Request, res: Response, reminderService: ReminderService) {
  const { action } = req.query;
  
  switch (action) {
    case 'health':
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
      break;
    case 'test':
      const result = await reminderService.testConnpassApi();
      res.json(result);
      break;
    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}