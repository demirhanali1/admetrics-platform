export interface AppConfig {
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sqsQueueUrl: string;
  };
  database: {
    mongoUri: string;
    postgres: {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };
  };
  app: {
    nodeEnv: string;
    logLevel: string;
  };
}

export class Config {
  private static instance: Config;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): AppConfig {
    return {
      aws: {
        region: this.getAwsRegion(),
        accessKeyId: this.getAwsAccessKeyId(),
        secretAccessKey: this.getAwsSecretAccessKey(),
        sqsQueueUrl: this.getSqsQueueUrl(),
      },
      database: {
        mongoUri: this.getMongoUri(),
        postgres: {
          host: this.getPostgresHost(),
          port: this.getPostgresPort(),
          username: this.getPostgresUsername(),
          password: this.getPostgresPassword(),
          database: this.getPostgresDatabase(),
        },
      },
      app: {
        nodeEnv: this.getNodeEnv(),
        logLevel: this.getLogLevel(),
      },
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  private getAwsRegion(): string {
    return process.env.AWS_REGION || 'us-east-1';
  }

  private getAwsAccessKeyId(): string {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    if (!accessKeyId) {
      throw new Error('AWS_ACCESS_KEY_ID environment variable is required');
    }
    return accessKeyId;
  }

  private getAwsSecretAccessKey(): string {
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!secretAccessKey) {
      throw new Error('AWS_SECRET_ACCESS_KEY environment variable is required');
    }
    return secretAccessKey;
  }

  private getSqsQueueUrl(): string {
    const queueUrl = process.env.SQS_QUEUE_URL;
    if (!queueUrl) {
      throw new Error('SQS_QUEUE_URL environment variable is required');
    }
    return queueUrl;
  }

  private getMongoUri(): string {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is required');
    }
    return mongoUri;
  }

  private getPostgresHost(): string {
    return process.env.POSTGRES_URI || 'localhost';
  }

  private getPostgresPort(): number {
    const port = process.env.POSTGRES_PORT;
    return port ? parseInt(port, 10) : 5432;
  }

  private getPostgresUsername(): string {
    const username = process.env.POSTGRES_USERNAME;
    if (!username) {
      throw new Error('POSTGRES_USERNAME environment variable is required');
    }
    return username;
  }

  private getPostgresPassword(): string {
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) {
      throw new Error('POSTGRES_PASSWORD environment variable is required');
    }
    return password;
  }

  private getPostgresDatabase(): string {
    const database = process.env.POSTGRES_DATABASE;
    if (!database) {
      throw new Error('POSTGRES_DATABASE environment variable is required');
    }
    return database;
  }

  private getNodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  private getLogLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  }
}
