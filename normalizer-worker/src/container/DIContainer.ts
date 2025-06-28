import { EventProcessorService } from '../services/EventProcessor';
import { SQSConsumerService } from '../services/sqs/SQSConsumerService';
import { MessageConsumerService } from '../types/Event';

export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, unknown> = new Map();

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  private initializeServices(): void {
    const eventProcessor = new EventProcessorService();
    const sqsConsumer = new SQSConsumerService(eventProcessor);

    this.services.set('eventProcessor', eventProcessor);
    this.services.set('sqsConsumer', sqsConsumer);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }

  getEventProcessor(): EventProcessorService {
    return this.get<EventProcessorService>('eventProcessor');
  }

  getSQSConsumer(): MessageConsumerService {
    return this.get<MessageConsumerService>('sqsConsumer');
  }
}
