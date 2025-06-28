import { DataSource, Repository } from 'typeorm';
import { DatabaseService, DatabaseResult, NormalizedEvent } from '../../types/Event';
import { Config } from '../../config/Config';
import { NormalizedEvent as NormalizedEventEntity } from '../../entity/NormalizedEvent';

export class PostgreSQLService implements DatabaseService {
  private dataSource: DataSource;
  private repository!: Repository<NormalizedEventEntity>;
  private static instance: PostgreSQLService;

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
      extra: {
        max: 50,
        min: 10,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 5000,
        query_timeout: 30000,
        statement_timeout: 30000,
        ssl: config.app.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
        application_name: 'normalizer-api',
        prepare: false,
        binary: true,
      },
      poolSize: 50,
      logging: config.app.nodeEnv === 'development' ? ['error'] : false,
      migrationsRun: false,
      subscribers: [],
    });
  }

  static getInstance(): PostgreSQLService {
    if (!PostgreSQLService.instance) {
      PostgreSQLService.instance = new PostgreSQLService();
    }
    return PostgreSQLService.instance;
  }

  async connect(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        this.repository = this.dataSource.getRepository(NormalizedEventEntity);
        console.log('PostgreSQL connected successfully with high-performance pooling');
      }
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        console.log('PostgreSQL disconnected successfully');
      }
    } catch (error) {
      console.error('PostgreSQL disconnection failed:', error);
      throw error;
    }
  }

  getConnectionPoolStatus() {
    if (!this.dataSource.isInitialized) {
      return { connected: false, poolSize: 0, activeConnections: 0 };
    }

    const driver = this.dataSource.driver as any;
    return {
      connected: this.dataSource.isInitialized,
      poolSize: driver.pool ? driver.pool.size : 0,
      activeConnections: driver.pool ? driver.pool.length : 0,
    };
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

      const normalizedEventEntity = new NormalizedEventEntity();
      normalizedEventEntity.unified_campaign_id = event.unified_campaign_id;
      normalizedEventEntity.campaign_name = event.campaign_name;
      normalizedEventEntity.source_platform = event.source_platform;
      normalizedEventEntity.event_date = event.event_date;
      normalizedEventEntity.impressions = event.impressions;
      normalizedEventEntity.clicks = event.clicks;
      normalizedEventEntity.spend = event.spend;
      normalizedEventEntity.conversions = event.conversions;

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

  async saveNormalizedEvents(events: NormalizedEvent[]): Promise<DatabaseResult[]> {
    try {
      if (!this.repository) {
        throw new Error('Database not connected');
      }

      const entities = events.map((event: NormalizedEvent) => {
        const entity = new NormalizedEventEntity();
        entity.unified_campaign_id = event.unified_campaign_id;
        entity.campaign_name = event.campaign_name;
        entity.source_platform = event.source_platform;
        entity.event_date = event.event_date;
        entity.impressions = event.impressions;
        entity.clicks = event.clicks;
        entity.spend = event.spend;
        entity.conversions = event.conversions;
        return entity;
      });

      const chunkSize = 1000;
      const results: DatabaseResult[] = [];

      for (let i = 0; i < entities.length; i += chunkSize) {
        const chunk = entities.slice(i, i + chunkSize);
        const savedEvents = await this.repository.save(chunk, {
          chunk: chunkSize,
          reload: false,
        });

        results.push(...savedEvents.map(event => ({
          success: true,
          id: event.id.toString()
        })));
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to batch save normalized events to PostgreSQL:', error);

      return events.map(() => ({
        success: false,
        error: errorMessage
      }));
    }
  }

  async bulkInsertNormalizedEvents(events: NormalizedEvent[]): Promise<DatabaseResult[]> {
    try {
      if (!this.dataSource.isInitialized) {
        throw new Error('Database not connected');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const values = events.map(event =>
          `('${event.unified_campaign_id}', '${event.campaign_name}', '${event.source_platform}', '${event.event_date}', ${event.impressions}, ${event.clicks}, ${event.spend}, ${event.conversions})`
        ).join(',');

        const sql = `
          INSERT INTO normalized_events 
          (unified_campaign_id, campaign_name, source_platform, event_date, impressions, clicks, spend, conversions)
          VALUES ${values}
          ON CONFLICT DO NOTHING
        `;

        await queryRunner.query(sql);
        await queryRunner.commitTransaction();

        return events.map(() => ({
          success: true,
          id: 'bulk-inserted'
        }));
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to bulk insert normalized events:', error);

      return events.map(() => ({
        success: false,
        error: errorMessage
      }));
    }
  }
}
