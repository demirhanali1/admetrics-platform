import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message } from '@aws-sdk/client-sqs';
import { MessageConsumerService, SQSMessage } from '../../types/Event';
import { Config } from '../../config/Config';
import { EventProcessor } from '../../types/Event';

export class SQSConsumerService implements MessageConsumerService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly eventProcessor: EventProcessor;
  private isRunning = false;
  private pollingInterval = 5000; // 5 seconds

  constructor(eventProcessor: EventProcessor) {
    const config = Config.getInstance().getConfig();

    this.sqsClient = new SQSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
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
    console.log('Starting SQS consumer...');

    while (this.isRunning) {
      try {
        const messages = await this.receiveMessages();

        for (const message of messages) {
          await this.processMessage(message);
        }

        await this.sleep(this.pollingInterval);
      } catch (error) {
        console.error('Error in SQS consumer loop:', error);
        await this.sleep(this.pollingInterval);
      }
    }
  }

  async stopConsuming(): Promise<void> {
    this.isRunning = false;
    console.log('Stopping SQS consumer...');
  }

  private async receiveMessages(): Promise<SQSMessage[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 30,
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

  private async processMessage(message: SQSMessage): Promise<void> {
    try {
      console.log(`Processing message: ${message.MessageId}`);

      const payload = JSON.parse(message.Body);
      await this.eventProcessor.processEvent(payload);

      await this.deleteMessage(message.ReceiptHandle);
      console.log(`Message processed and deleted: ${message.MessageId}`);
    } catch (error) {
      console.error(`Error processing message ${message.MessageId}:`, error);
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
}
