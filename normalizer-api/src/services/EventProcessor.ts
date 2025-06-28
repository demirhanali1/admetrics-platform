import { EventProcessor, RawEvent, DatabaseService } from '../types/Event';
import { NormalizerFactory } from './normalizers/EventNormalizerFactory';
import { MongoDBService } from './database/MongoDBService';
import { PostgreSQLService } from './database/PostgreSQLService';

export class EventProcessorService implements EventProcessor {
  private readonly mongoService: DatabaseService;
  private readonly postgresService: DatabaseService;
  private readonly normalizerFactory: NormalizerFactory;
  private processedCount = 0;
  private errorCount = 0;
  private lastLogTime = Date.now();

  constructor() {
    this.mongoService = new MongoDBService();
    this.postgresService = new PostgreSQLService();
    this.normalizerFactory = new NormalizerFactory();
  }

  async processEvent(event: RawEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Step 1: Save raw event to MongoDB
      const rawEventResult = await this.mongoService.saveRawEvent(event);
      if (!rawEventResult.success) {
        throw new Error(`Failed to save raw event: ${rawEventResult.error}`);
      }

      // Step 2: Normalize the event
      const normalizer = this.normalizerFactory.createNormalizer(event.source);
      const normalizedEvent = normalizer.normalize(event.payload);

      // Step 3: Save normalized event to PostgreSQL
      const normalizedEventResult = await this.postgresService.saveNormalizedEvent(normalizedEvent);
      if (!normalizedEventResult.success) {
        throw new Error(`Failed to save normalized event: ${normalizedEventResult.error}`);
      }

      // Update metrics
      this.processedCount++;
      this.logMetrics(startTime);

    } catch (error) {
      this.errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing event from ${event.source}: ${errorMessage}`);
      throw error;
    }
  }

  private logMetrics(startTime: number): void {
    const now = Date.now();
    const processingTime = now - startTime;
    
    // Log metrics every 100 events or every 10 seconds
    if (this.processedCount % 100 === 0 || (now - this.lastLogTime) > 10000) {
      console.log(`📊 Metrics: ${this.processedCount} processed, ${this.errorCount} errors, last event took ${processingTime}ms`);
      this.lastLogTime = now;
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing event processor...');
      
      // Connect to databases concurrently
      const [mongoResult, postgresResult] = await Promise.allSettled([
        this.mongoService.connect(),
        this.postgresService.connect()
      ]);

      if (mongoResult.status === 'rejected') {
        throw new Error(`MongoDB connection failed: ${mongoResult.reason}`);
      }

      if (postgresResult.status === 'rejected') {
        throw new Error(`PostgreSQL connection failed: ${postgresResult.reason}`);
      }

      console.log('✅ Event processor initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize event processor:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down event processor...');
      
      // Disconnect from databases concurrently
      await Promise.allSettled([
        this.mongoService.disconnect(),
        this.postgresService.disconnect()
      ]);

      console.log(`✅ Event processor shutdown successfully. Final stats: ${this.processedCount} processed, ${this.errorCount} errors`);
    } catch (error) {
      console.error('❌ Error during event processor shutdown:', error);
      throw error;
    }
  }

  // Getter methods for monitoring
  getProcessedCount(): number {
    return this.processedCount;
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  getSuccessRate(): number {
    const total = this.processedCount + this.errorCount;
    return total > 0 ? (this.processedCount / total) * 100 : 0;
  }
}
