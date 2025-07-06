const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'connpass-line-reminder',
    version: '1.0.0'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Backend server is running correctly',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Main function endpoint simulation
app.post('/connpass-reminder', async (req, res) => {
  try {
    const { type } = req.body;
    
    switch (type) {
      case 'scheduled':
        res.json({ 
          message: 'Scheduled reminders would be processed', 
          type: 'scheduled',
          status: 'success'
        });
        break;
      case 'webhook':
        res.json({ 
          message: 'Webhook would be processed', 
          type: 'webhook',
          status: 'success'
        });
        break;
      default:
        res.status(400).json({ error: 'Invalid request type' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Test endpoint: http://localhost:${port}/test`);
});