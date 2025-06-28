import express from 'express';
import { EventController } from './controllers/EventController';
import { EventService } from './services/EventService';
import { SQSMessageQueueService } from './services/SQSMessageQueueService';
import { DIContainer } from './container/DIContainer';

const app = express();

// Performance optimizations for high throughput
app.use(express.json({ 
  limit: '10mb', // Increase payload limit
  strict: false, // Allow non-strict JSON
}));

// Disable unnecessary middleware for performance
app.disable('x-powered-by');
app.disable('etag');

// Add compression for responses
import compression from 'compression';
app.use(compression());

// Add rate limiting for protection
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10000, // Allow 10,000 requests per minute per IP
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Add request timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Metrics endpoint
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

// Event endpoint with performance optimizations
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

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

export default app;
