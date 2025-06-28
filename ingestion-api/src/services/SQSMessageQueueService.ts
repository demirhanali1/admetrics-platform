import { SQSClient, SendMessageCommand, SendMessageCommandInput, SendMessageBatchCommand, SendMessageBatchCommandInput } from '@aws-sdk/client-sqs';
import { Event, MessageQueueService, SQSMessageResult } from '../types/Event';
import { Config } from '../config/Config';

export class SQSMessageQueueService implements MessageQueueService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private messageBatch: Event[] = [];
  private batchSize = 10;
  private flushInterval = 1000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    const config = Config.getInstance().getConfig();
    this.queueUrl = config.aws.sqsQueueUrl;
    this.sqsClient = new SQSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
      maxAttempts: 3,
      requestHandler: {
        maxConcurrentRequests: 50,
      },
    });

    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch();
    }, this.flushInterval);
  }

  private async flushBatch(): Promise<void> {
    if (this.messageBatch.length === 0) return;

    const batch = [...this.messageBatch];
    this.messageBatch = [];

    try {
      await this.sendMessageBatch(batch);
    } catch (error) {
      console.error('Failed to flush message batch:', error);
      this.messageBatch.unshift(...batch);
    }
  }

  async sendMessage(message: Event): Promise<SQSMessageResult> {
    try {
      this.messageBatch.push(message);

      if (this.messageBatch.length >= this.batchSize) {
        const batch = [...this.messageBatch];
        this.messageBatch = [];

        const results = await this.sendMessageBatch(batch);
        const messageIndex = batch.findIndex(msg => msg === message);

        if (messageIndex >= 0 && results[messageIndex]) {
          return results[messageIndex];
        }
      }

      return {
        messageId: `batched-${Date.now()}-${Math.random()}`,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send message to SQS:', error);

      return {
        messageId: '',
        success: false,
        error: errorMessage
      };
    }
  }

  private async sendMessageBatch(messages: Event[]): Promise<SQSMessageResult[]> {
    try {
      const chunks = this.chunkArray(messages, 10);
      const allResults: SQSMessageResult[] = [];

      for (const chunk of chunks) {
        const batchParams: SendMessageBatchCommandInput = {
          QueueUrl: this.queueUrl,
          Entries: chunk.map((message, index) => ({
            Id: `msg-${Date.now()}-${index}`,
            MessageBody: JSON.stringify(message),
          })),
        };

        const command = new SendMessageBatchCommand(batchParams);
        const result = await this.sqsClient.send(command);

        const chunkResults: SQSMessageResult[] = chunk.map((_, index) => {
          const entry = result.Successful?.find(s => s.Id === `msg-${Date.now()}-${index}`);
          if (entry) {
            return {
              messageId: entry.MessageId || '',
              success: true
            };
          } else {
            return {
              messageId: '',
              success: false,
              error: 'Message not sent successfully'
            };
          }
        });

        allResults.push(...chunkResults);
      }

      console.log(`Batch sent to SQS: ${messages.length} messages`);
      return allResults;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send message batch to SQS:', error);

      return messages.map(() => ({
        messageId: '',
        success: false,
        error: errorMessage
      }));
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  setBatchSize(size: number): void {
    this.batchSize = Math.max(1, Math.min(10, size)); // SQS limit is 10
    console.log(`SQS batch size updated to: ${this.batchSize}`);
  }

  setFlushInterval(interval: number): void {
    this.flushInterval = interval;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.startFlushTimer();
    console.log(`SQS flush interval updated to: ${interval}ms`);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.messageBatch.length > 0) {
      await this.flushBatch();
    }
  }
}
