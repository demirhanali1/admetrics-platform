import mongoose from 'mongoose';
import { DatabaseService, DatabaseResult, RawEvent } from '../../types/Event';
import { Config } from '../../config/Config';

export class MongoDBService implements DatabaseService {
  private isConnected = false;
  private readonly mongoUri: string;
  private readonly RawEventModel: mongoose.Model<RawEvent>;
  private static instance: MongoDBService;

  constructor() {
    const config = Config.getInstance().getConfig();
    this.mongoUri = config.database.mongoUri;

    const rawEventSchema = new mongoose.Schema({
      source: { type: String, required: true },
      payload: { type: mongoose.Schema.Types.Mixed, required: true },
      timestamp: { type: String },
      id: { type: String },
      receivedAt: { type: Date, required: true }
    }, {
      timestamps: true,
      collection: 'raw_events',
      // Performans optimizasyonu
      autoIndex: false,
      bufferCommands: false,
      // yazma optimizasyonu
      writeConcern: { w: 1, j: false },
      validateBeforeSave: false,
    });

    this.RawEventModel = mongoose.models.RawEvent || mongoose.model<RawEvent>('RawEvent', rawEventSchema);
  }

  static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const config = Config.getInstance().getConfig();

      await mongoose.connect(this.mongoUri, {
        maxPoolSize: 100,
        minPoolSize: 20,
        maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 15000,
        writeConcern: {
          w: 1,
          j: false,
          wtimeout: 5000,
        },
        readPreference: 'primary',
        retryWrites: true,
        bufferCommands: false,
        maxConnecting: 10,
        heartbeatFrequencyMS: 30000,
        directConnection: false,
      });

      this.isConnected = true;
      console.log('MongoDB connected successfully with high-performance pooling');
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB disconnected successfully');
    } catch (error) {
      console.error('MongoDB disconnection failed:', error);
      throw error;
    }
  }

  getConnectionPoolStatus() {
    if (!this.isConnected) {
      return { connected: false, poolSize: 0, activeConnections: 0 };
    }

    const poolSize = mongoose.connections.length;
    const activeConnections = mongoose.connections.filter(conn => conn.readyState === 1).length;
    const connection = mongoose.connection;
    return {
      connected: this.isConnected,
      poolSize,
      activeConnections,
      readyState: connection.readyState,
    };
  }

  async saveRawEvent(event: RawEvent): Promise<DatabaseResult> {
    try {
      await this.connect();

      const rawEvent = new this.RawEventModel({
        ...event,
        receivedAt: new Date()
      });

      const savedEvent = await rawEvent.save();

      return {
        success: true,
        id: savedEvent._id.toString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to save raw event to MongoDB:', error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async saveRawEvents(events: RawEvent[]): Promise<DatabaseResult[]> {
    try {
      await this.connect();

      const rawEvents = events.map(event => ({
        ...event,
        receivedAt: new Date()
      }));

      const batchSize = 5000;
      const results: DatabaseResult[] = [];

      for (let i = 0; i < rawEvents.length; i += batchSize) {
        const batch = rawEvents.slice(i, i + batchSize);

        const savedEvents = await this.RawEventModel.insertMany(batch, {
          ordered: false,
          lean: true,
        });

        results.push(...savedEvents.map(event => ({
          success: true,
          id: event._id.toString()
        })));
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to batch save raw events to MongoDB:', error);

      return events.map(() => ({
        success: false,
        error: errorMessage
      }));
    }
  }

  async bulkInsertRawEvents(events: RawEvent[]): Promise<DatabaseResult[]> {
    try {
      await this.connect();

      const collection = mongoose.connection.db.collection('raw_events');

      const documents = events.map(event => ({
        ...event,
        receivedAt: new Date()
      }));

      const bulkOps = documents.map(doc => ({
        insertOne: { document: doc }
      }));

      const result = await collection.bulkWrite(bulkOps, {
        ordered: false, // Continue on errors
        writeConcern: { w: 1, j: false }, // Don't wait for journal commit
      });

      return events.map(() => ({
        success: true,
        id: 'bulk-inserted'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to bulk insert raw events to MongoDB:', error);

      return events.map(() => ({
        success: false,
        error: errorMessage
      }));
    }
  }

  async saveNormalizedEvent(): Promise<DatabaseResult> {
    return {
      success: false,
      error: 'Normalized events are not supported in MongoDB service'
    };
  }
}
