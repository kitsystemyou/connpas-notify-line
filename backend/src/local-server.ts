import express from 'express';
import { ReminderService } from './services/reminder.service';
import { Logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 8080;
const logger = new Logger('local-server');

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'connpass-line-reminder',
    version: '1.0.0'
  });
});

app.get('/test', async (req, res) => {
  try {
    const reminderService = new ReminderService();
    const result = await reminderService.testConnpassApi();
    res.json({
      message: 'Backend server is running correctly',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      connpassTest: result
    });
  } catch (error) {
    logger.error('Test endpoint error', error);
    res.status(500).json({
      message: 'Backend server is running but with errors',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/connpass-reminder', async (req, res) => {
  try {
    logger.info('Function execution started', { method: req.method, path: req.path });
    
    const reminderService = new ReminderService();
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
  } catch (error) {
    logger.error('Function execution failed', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  logger.info(`Local development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Test endpoint: http://localhost:${port}/test`);
  console.log(`Main endpoint: http://localhost:${port}/connpass-reminder`);
});