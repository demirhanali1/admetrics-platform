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
      // High-performance optimizations for 100M events/day
      autoIndex: false, // Disable automatic index creation
      bufferCommands: false, // Disable mongoose buffering
      // Optimize for write performance
      writeConcern: { w: 1, j: false }, // Don't wait for journal commit
      // Disable validation for performance
      validateBeforeSave: false,
    });

    this.RawEventModel = mongoose.models.RawEvent || mongoose.model<RawEvent>('RawEvent', rawEventSchema);
  }

  // Singleton pattern for connection reuse
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
      
      // High-performance connection pooling for 100M events/day
      await mongoose.connect(this.mongoUri, {
        // Connection pool settings optimized for high throughput
        maxPoolSize: 100, // Much larger pool for high concurrency
        minPoolSize: 20,  // More minimum connections
        maxIdleTimeMS: 60000, // Longer idle timeout
        serverSelectionTimeoutMS: 10000, // Longer server selection timeout
        socketTimeoutMS: 60000, // Longer socket timeout
        connectTimeoutMS: 15000, // Longer connection timeout
        // Write concern optimized for performance
        writeConcern: {
          w: 1, // Wait for primary acknowledgment only
          j: false, // Don't wait for journal commit
          wtimeout: 5000, // 5 second timeout
        },
        // Read preference
        readPreference: 'primary',
        // Retry writes
        retryWrites: true,
        // Buffer commands
        bufferCommands: false,
        // Performance optimizations
        maxConnecting: 10, // Limit concurrent connection attempts
        // Disable heartbeat for performance
        heartbeatFrequencyMS: 30000,
        // Optimize for bulk operations
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

  // Get connection pool status for monitoring
  getConnectionPoolStatus() {
    if (!this.isConnected) {
      return { connected: false, poolSize: 0, activeConnections: 0 };
    }

    // Use mongoose.connections for pool info
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

  // High-performance batch save for 100M events/day
  async saveRawEvents(events: RawEvent[]): Promise<DatabaseResult[]> {
    try {
      await this.connect();

      // Use insertMany with optimized options for maximum performance
      const rawEvents = events.map(event => ({
        ...event,
        receivedAt: new Date()
      }));

      // Use large batch size with optimized options
      const batchSize = 5000; // Optimal batch size for MongoDB
      const results: DatabaseResult[] = [];

      for (let i = 0; i < rawEvents.length; i += batchSize) {
        const batch = rawEvents.slice(i, i + batchSize);
        
        const savedEvents = await this.RawEventModel.insertMany(batch, {
          ordered: false, // Continue inserting even if some documents fail
          lean: true, // Return plain JavaScript objects instead of Mongoose documents
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

  // Ultra-fast bulk insert using native MongoDB driver for maximum performance
  async bulkInsertRawEvents(events: RawEvent[]): Promise<DatabaseResult[]> {
    try {
      await this.connect();

      // Get native MongoDB collection for maximum performance
      const collection = mongoose.connection.db.collection('raw_events');
      
      const documents = events.map(event => ({
        ...event,
        receivedAt: new Date()
      }));

      // Use bulk operations for maximum performance
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
    // MongoDB service doesn't handle normalized events
    return {
      success: false,
      error: 'Normalized events are not supported in MongoDB service'
    };
  }
}
