import { EventProcessor, RawEvent, DatabaseService } from '../types/Event';
import { NormalizerFactory } from './normalizers/EventNormalizerFactory';
import { MongoDBService } from './database/MongoDBService';
import { PostgreSQLService } from './database/PostgreSQLService';

export class EventProcessorService implements EventProcessor {
  private readonly mongoService: DatabaseService;
  private readonly postgresService: DatabaseService;
  private readonly normalizerFactory: NormalizerFactory;

  constructor() {
    this.mongoService = new MongoDBService();
    this.postgresService = new PostgreSQLService();
    this.normalizerFactory = new NormalizerFactory();
  }

  async processEvent(event: RawEvent): Promise<void> {
    try {
      console.log(`Processing event from source: ${event.source}`);

      const rawEventResult = await this.mongoService.saveRawEvent(event);
      if (!rawEventResult.success) {
        throw new Error(`Failed to save raw event: ${rawEventResult.error}`);
      }
      console.log('Raw event saved to MongoDB');

      const normalizer = this.normalizerFactory.createNormalizer(event.source);
      const normalizedEvent = normalizer.normalize(event.payload);
      console.log('Event normalized successfully');

      const normalizedEventResult = await this.postgresService.saveNormalizedEvent(normalizedEvent);
      if (!normalizedEventResult.success) {
        throw new Error(`Failed to save normalized event: ${normalizedEventResult.error}`);
      }
      console.log('Normalized event saved to PostgreSQL');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing event: ${errorMessage}`);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.mongoService.connect();
      await this.postgresService.connect();
      console.log('Event processor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize event processor:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.mongoService.disconnect();
      await this.postgresService.disconnect();
      console.log('Event processor shutdown successfully');
    } catch (error) {
      console.error('Error during event processor shutdown:', error);
      throw error;
    }
  }
}
