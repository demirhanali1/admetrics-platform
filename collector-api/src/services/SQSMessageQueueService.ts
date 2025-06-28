import { SQSClient, SendMessageCommand, SendMessageCommandInput } from '@aws-sdk/client-sqs';
import { Event, MessageQueueService, SQSMessageResult } from '../types/Event';
import { Config } from '../config/Config';

export class SQSMessageQueueService implements MessageQueueService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor() {
    const config = Config.getInstance().getConfig();
    this.queueUrl = config.aws.sqsQueueUrl;
    this.sqsClient = new SQSClient({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
  }

  async sendMessage(message: Event): Promise<SQSMessageResult> {
    try {
      const params: SendMessageCommandInput = {
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      };

      const command = new SendMessageCommand(params);
      const result = await this.sqsClient.send(command);

      console.log('Message sent to SQS:', result.MessageId);
      
      return {
        messageId: result.MessageId || '',
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
} 