import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import { MessageConsumerService, SQSMessage } from '../../types/Event';
import { Config } from '../../config/Config';
import { EventProcessor } from '../../types/Event';

export class SQSConsumerService implements MessageConsumerService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly eventProcessor: EventProcessor;
  private isRunning = false;
  private pollingInterval = 1000;
  private maxConcurrentMessages = 50;
  private maxMessagesPerBatch = 10;
  private processingTimeout = 25000;

  constructor(eventProcessor: EventProcessor) {
    const config = Config.getInstance().getConfig();

    this.sqsClient = new SQSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
      maxAttempts: 3,
    });

    this.queueUrl = config.aws.sqsQueueUrl;
    this.eventProcessor = eventProcessor;
  }

  async startConsuming(): Promise<void> {
    if (this.isRunning) {
      console.log('SQS consumer is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting SQS consumer with concurrent processing...');

    const consumerPromises = Array.from({ length: 3 }, (_, i) =>
      this.consumerLoop(`Consumer-${i + 1}`)
    );

    await Promise.all(consumerPromises);
  }

  async stopConsuming(): Promise<void> {
    this.isRunning = false;
    console.log('Stopping SQS consumer...');
  }

  private async consumerLoop(consumerName: string): Promise<void> {
    while (this.isRunning) {
      try {
        const messages = await this.receiveMessages();

        if (messages.length === 0) {
          await this.sleep(this.pollingInterval);
          continue;
        }

        console.log(`${consumerName}: Processing ${messages.length} messages concurrently`);

        const processingPromises = messages.map(message =>
          this.processMessageWithTimeout(message, consumerName)
        );

        const results = await Promise.allSettled(processingPromises);

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (successful > 0 || failed > 0) {
          console.log(`${consumerName}: ${successful} successful, ${failed} failed`);
        }

        await this.sleep(100);
      } catch (error) {
        console.error(`${consumerName}: Error in consumer loop:`, error);
        await this.sleep(this.pollingInterval);
      }
    }
  }

  private async receiveMessages(): Promise<SQSMessage[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.maxMessagesPerBatch,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 30,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      if (!response.Messages) {
        return [];
      }

      return response.Messages.map((message: Message) => ({
        MessageId: message.MessageId!,
        ReceiptHandle: message.ReceiptHandle!,
        Body: message.Body!,
      }));
    } catch (error) {
      console.error('Error receiving messages from SQS:', error);
      throw error;
    }
  }

  private async processMessageWithTimeout(message: SQSMessage, consumerName: string): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout')), this.processingTimeout);
    });

    const processingPromise = this.processMessage(message, consumerName);

    try {
      await Promise.race([processingPromise, timeoutPromise]);
    } catch (error) {
      console.error(`${consumerName}: Message ${message.MessageId} failed or timed out:`, error);
      throw error;
    }
  }

  private async processMessage(message: SQSMessage, consumerName: string): Promise<void> {
    const startTime = Date.now();

    try {
      const payload = JSON.parse(message.Body);
      await this.eventProcessor.processEvent(payload);

      await this.deleteMessage(message.ReceiptHandle);

      const processingTime = Date.now() - startTime;
      console.log(`${consumerName}: Message ${message.MessageId} processed in ${processingTime}ms`);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`${consumerName}: Error processing message ${message.MessageId} after ${processingTime}ms:`, error);
      throw error;
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setMaxConcurrentMessages(max: number): void {
    this.maxConcurrentMessages = max;
  }

  setPollingInterval(interval: number): void {
    this.pollingInterval = interval;
  }

  setProcessingTimeout(timeout: number): void {
    this.processingTimeout = timeout;
  }
}
