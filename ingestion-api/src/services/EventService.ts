import { Event, EventService as IEventService, EventValidator, MessageQueueService, SQSMessageResult } from '../types/Event';
import { EventValidator as EventValidatorClass } from '../validators/eventValidator';

export class EventService implements IEventService {
  private readonly validator: EventValidator;
  private readonly messageQueueService: MessageQueueService;
  private processedCount = 0;
  private errorCount = 0;
  private lastLogTime = Date.now();
  private startTime = Date.now();

  constructor(messageQueueService: MessageQueueService) {
    this.validator = new EventValidatorClass();
    this.messageQueueService = messageQueueService;
  }

  async processEvent(event: Event): Promise<SQSMessageResult> {
    const startTime = Date.now();

    try {
      const validation = this.validator.validate(event);

      if (!validation.isValid) {
        this.errorCount++;
        this.logMetrics(startTime);
        return {
          messageId: '',
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      const result = await this.messageQueueService.sendMessage(event);

      if (result.success) {
        this.processedCount++;
      } else {
        this.errorCount++;
      }

      this.logMetrics(startTime);
      return result;
    } catch (error) {
      this.errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logMetrics(startTime);
      return {
        messageId: '',
        success: false,
        error: errorMessage
      };
    }
  }

  private logMetrics(startTime: number): void {
    const now = Date.now();
    const timeSinceLastLog = now - this.lastLogTime;

    if (this.processedCount % 1000 === 0 || timeSinceLastLog >= 30000) {
      const processingTime = now - startTime;
      const successRate = this.getSuccessRate();
      const eventsPerSecond = this.calculateEventsPerSecond();
      const uptime = (now - this.startTime) / 1000;

      console.log(`Ingestion API High-Throughput Metrics:
        - Processed: ${this.processedCount.toLocaleString()}
        - Errors: ${this.errorCount.toLocaleString()}
        - Success Rate: ${successRate.toFixed(2)}%
        - Events/Second: ${eventsPerSecond.toFixed(2)}
        - Uptime: ${uptime.toFixed(0)}s
        - Last Event Processing Time: ${processingTime}ms
      `);

      this.lastLogTime = now;
    }
  }

  private calculateEventsPerSecond(): number {
    const now = Date.now();
    const uptime = (now - this.startTime) / 1000;
    return uptime > 0 ? this.processedCount / uptime : 0;
  }

  getSuccessRate(): number {
    const total = this.processedCount + this.errorCount;
    return total > 0 ? (this.processedCount / total) * 100 : 0;
  }

  getMetrics() {
    const now = Date.now();
    const uptime = (now - this.startTime) / 1000;

    return {
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      successRate: this.getSuccessRate(),
      eventsPerSecond: this.calculateEventsPerSecond(),
      uptimeSeconds: uptime,
      memoryUsage: process.memoryUsage(),
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down EventService...');

    if (this.messageQueueService && typeof (this.messageQueueService as any).shutdown === 'function') {
      await (this.messageQueueService as any).shutdown();
    }

    console.log('EventService shutdown completed');
  }
}
