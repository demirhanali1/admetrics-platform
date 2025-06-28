import mongoose from 'mongoose';
import { DatabaseService, DatabaseResult, RawEvent } from '../../types/Event';
import { Config } from '../../config/Config';

export class MongoDBService implements DatabaseService {
  private isConnected = false;
  private readonly mongoUri: string;
  private readonly RawEventModel: mongoose.Model<RawEvent>;

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
      collection: 'raw_events'
    });

    this.RawEventModel = mongoose.models.RawEvent || mongoose.model<RawEvent>('RawEvent', rawEventSchema);
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await mongoose.connect(this.mongoUri);
      this.isConnected = true;
      console.log('MongoDB connected successfully');
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

  async saveNormalizedEvent(): Promise<DatabaseResult> {
    // MongoDB service doesn't handle normalized events
    return {
      success: false,
      error: 'Normalized events are not supported in MongoDB service'
    };
  }
}
