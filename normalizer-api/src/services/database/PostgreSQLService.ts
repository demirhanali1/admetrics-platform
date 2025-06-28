import { DataSource, Repository } from 'typeorm';
import { DatabaseService, DatabaseResult, NormalizedEvent } from '../../types/Event';
import { Config } from '../../config/Config';
import { NormalizedEventEntity } from '../../entities/NormalizedEvent';

export class PostgreSQLService implements DatabaseService {
  private dataSource: DataSource;
  private repository: Repository<NormalizedEventEntity>;

  constructor() {
    const config = Config.getInstance().getConfig();

    this.dataSource = new DataSource({
      type: 'postgres',
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      username: config.database.postgres.username,
      password: config.database.postgres.password,
      database: config.database.postgres.database,
      entities: [NormalizedEventEntity],
      synchronize: config.app.nodeEnv === 'development',
      logging: config.app.nodeEnv === 'development',
    });
  }

  async connect(): Promise<void> {
    try {
      await this.dataSource.initialize();
      this.repository = this.dataSource.getRepository(NormalizedEventEntity);
      console.log('PostgreSQL connected successfully');
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.dataSource.destroy();
      console.log('PostgreSQL disconnected successfully');
    } catch (error) {
      console.error('PostgreSQL disconnection failed:', error);
      throw error;
    }
  }

  async saveRawEvent(): Promise<DatabaseResult> {
    return {
      success: false,
      error: 'Raw events are not supported in PostgreSQL service'
    };
  }

  async saveNormalizedEvent(event: NormalizedEvent): Promise<DatabaseResult> {
    try {
      if (!this.repository) {
        throw new Error('Database not connected');
      }

      const normalizedEventEntity = new NormalizedEventEntity({
        unified_campaign_id: event.unified_campaign_id,
        campaign_name: event.campaign_name,
        source_platform: event.source_platform,
        event_date: event.event_date,
        impressions: event.impressions,
        clicks: event.clicks,
        spend: event.spend,
        conversions: event.conversions,
      });

      const savedEvent = await this.repository.save(normalizedEventEntity);

      return {
        success: true,
        id: savedEvent.id.toString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to save normalized event to PostgreSQL:', error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
