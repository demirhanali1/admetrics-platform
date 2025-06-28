import { EventProcessor as IEventProcessor, DatabaseService, NormalizedEvent, RawEvent } from '../types/Event';
import { MongoDBService } from './database/MongoDBService';
import { PostgreSQLService } from './database/PostgreSQLService';
import { NormalizerFactory } from './normalizers/EventNormalizerFactory';

export class EventProcessorService implements IEventProcessor {
  private mongoService: DatabaseService;
  private postgresService: DatabaseService;
  private normalizerFactory: NormalizerFactory;
  private processedCount = 0;
  private errorCount = 0;
  private lastLogTime = Date.now();
  private batchSize = 1000; // Increased batch size for 100M events/day
  private eventBatch: RawEvent[] = [];
  private processingQueue: Promise<void>[] = [];
  private maxConcurrentBatches = 5; // Process multiple batches concurrently

  constructor() {
    this.mongoService = MongoDBService.getInstance();
    this.postgresService = PostgreSQLService.getInstance();
    this.normalizerFactory = new NormalizerFactory();
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing EventProcessor for high-throughput processing...');

      await Promise.all([
        this.mongoService.connect(),
        this.postgresService.connect()
      ]);

      console.log('EventProcessor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EventProcessor:', error);
      throw error;
    }
  }

  async processEvent(event: RawEvent): Promise<boolean> {
    try {
      const startTime = Date.now();

      this.eventBatch.push(event);

      if (this.eventBatch.length >= this.batchSize) {
        const batchPromise = this.processBatch();
        this.processingQueue.push(batchPromise);

        this.processingQueue = this.processingQueue.filter(p => !p.then);

        if (this.processingQueue.length >= this.maxConcurrentBatches) {
          await Promise.race(this.processingQueue);
        }
      }

      this.processedCount++;
      this.logMetrics(startTime);

      return true;
    } catch (error) {
      this.errorCount++;
      console.error('Failed to process event:', error);
      return false;
    }
  }

  private async processBatch(): Promise<void> {
    if (this.eventBatch.length === 0) return;

    const batch = [...this.eventBatch];
    this.eventBatch = [];

    try {
      const startTime = Date.now();

      const mongoService = this.mongoService as any;
      const postgresService = this.postgresService as any;

      const rawEventResults = await mongoService.saveRawEvents(batch);

      const normalizedEvents: NormalizedEvent[] = [];

      for (let i = 0; i < batch.length; i++) {
        const event = batch[i];
        const rawResult = rawEventResults[i];

        if (rawResult.success) {
          try {
            const normalizer = this.normalizerFactory.createNormalizer(event.source);
            const normalizedEvent = normalizer.normalize(event);
            normalizedEvents.push(normalizedEvent);
          } catch (normalizationError) {
            console.error('Failed to normalize event:', normalizationError);
            this.errorCount++;
          }
        } else {
          console.error('Failed to save raw event:', rawResult.error);
          this.errorCount++;
        }
      }

      if (normalizedEvents.length > 0) {
        const normalizedResults = await postgresService.saveNormalizedEvents(normalizedEvents);

        const successfulSaves = normalizedResults.filter((result: any) => result.success).length;
        this.processedCount += successfulSaves;
        this.errorCount += (normalizedEvents.length - successfulSaves);
      }

      const batchTime = Date.now() - startTime;
      console.log(`Batch processed: ${batch.length} events in ${batchTime}ms`);

    } catch (error) {
      console.error('Failed to process batch:', error);
      this.errorCount += batch.length;
    }
  }

  async flushBatch(): Promise<void> {
    await this.processBatch();

    if (this.processingQueue.length > 0) {
      await Promise.all(this.processingQueue);
    }
  }

  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down EventProcessor...');

      await this.flushBatch();

      await Promise.all([
        this.mongoService.disconnect(),
        this.postgresService.disconnect()
      ]);

      console.log('EventProcessor shut down successfully');
    } catch (error) {
      console.error('Failed to shutdown EventProcessor:', error);
      throw error;
    }
  }

  private logMetrics(startTime: number): void {
    const now = Date.now();
    const timeSinceLastLog = now - this.lastLogTime;

    if (this.processedCount % 1000 === 0 || timeSinceLastLog >= 30000) {
      const processingTime = now - startTime;
      const successRate = this.getSuccessRate();
      const eventsPerSecond = this.calculateEventsPerSecond();

      console.log(`EventProcessor High-Throughput Metrics:
        - Processed: ${this.processedCount.toLocaleString()}
        - Errors: ${this.errorCount.toLocaleString()}
        - Success Rate: ${successRate.toFixed(2)}%
        - Events/Second: ${eventsPerSecond.toFixed(2)}
        - Batch Size: ${this.batchSize}
        - Pending Events: ${this.eventBatch.length}
        - Concurrent Batches: ${this.processingQueue.length}
      `);

      this.logConnectionPoolStatus();

      this.lastLogTime = now;
    }
  }

  private calculateEventsPerSecond(): number {
    const now = Date.now();
    const timeElapsed = (now - this.lastLogTime) / 1000; // seconds
    return timeElapsed > 0 ? this.processedCount / timeElapsed : 0;
  }

  private logConnectionPoolStatus(): void {
    try {
      const mongoService = this.mongoService as any;
      const postgresService = this.postgresService as any;

      const mongoStatus = mongoService.getConnectionPoolStatus();
      const postgresStatus = postgresService.getConnectionPoolStatus();

      console.log(`Connection Pool Status:
        - MongoDB: ${mongoStatus.connected ? 'Connected' : 'Disconnected'} (Pool: ${mongoStatus.poolSize}, Active: ${mongoStatus.activeConnections})
        - PostgreSQL: ${postgresStatus.connected ? 'Connected' : 'Disconnected'} (Pool: ${postgresStatus.poolSize}, Active: ${postgresStatus.activeConnections})
      `);
    } catch (error) {
      console.error('Failed to get connection pool status:', error);
    }
  }

  getSuccessRate(): number {
    const total = this.processedCount + this.errorCount;
    return total > 0 ? (this.processedCount / total) * 100 : 0;
  }

  getMetrics() {
    return {
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      successRate: this.getSuccessRate(),
      batchSize: this.batchSize,
      pendingBatchSize: this.eventBatch.length,
      concurrentBatches: this.processingQueue.length,
      eventsPerSecond: this.calculateEventsPerSecond(),
    };
  }

  setBatchSize(size: number): void {
    this.batchSize = Math.max(100, Math.min(10000, size));
    console.log(`Batch size updated to: ${this.batchSize}`);
  }

  getBatchSize(): number {
    return this.batchSize;
  }

  setMaxConcurrentBatches(max: number): void {
    this.maxConcurrentBatches = Math.max(1, Math.min(20, max));
    console.log(`Max concurrent batches updated to: ${this.maxConcurrentBatches}`);
  }
}
