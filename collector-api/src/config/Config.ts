export interface AppConfig {
  port: number;
  nodeEnv: string;
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sqsQueueUrl: string;
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
      port: this.getPort(),
      nodeEnv: this.getNodeEnv(),
      aws: {
        region: this.getAwsRegion(),
        accessKeyId: this.getAwsAccessKeyId(),
        secretAccessKey: this.getAwsSecretAccessKey(),
        sqsQueueUrl: this.getSqsQueueUrl(),
      },
    };
  }

  getConfig(): AppConfig {
    return this.config;
  }

  private getPort(): number {
    const port = process.env.PORT;
    return port ? parseInt(port, 10) : 3000;
  }

  private getNodeEnv(): string {
    return process.env.NODE_ENV || 'development';
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
} 