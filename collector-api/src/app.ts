import express from 'express';
import { EventController } from './controllers/EventController';
import { EventService } from './services/EventService';
import { SQSMessageQueueService } from './services/SQSMessageQueueService';
import { DIContainer } from './container/DIContainer';

const app = express();

app.use(express.json({
  limit: '10mb',
  strict: false,
}));

app.disable('x-powered-by');
app.disable('etag');

import compression from 'compression';
app.use(compression());

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10000,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/metrics', (req, res) => {
  const container = DIContainer.getInstance();
  const eventService = container.getEventService();
  const metrics = eventService.getMetrics();

  res.status(200).json({
    metrics,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.post('/events', async (req, res) => {
  try {
    const container = DIContainer.getInstance();
    const eventController = container.getEventController();

    await eventController.handleEventPost(req, res);
  } catch (error) {
    console.error('Unhandled error in event endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

export default app;
