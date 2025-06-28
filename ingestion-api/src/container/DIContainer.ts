import { EventService } from '../services/EventService';
import { SQSMessageQueueService } from '../services/SQSMessageQueueService';
import { EventController } from '../controllers/EventController';

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
    const messageQueueService = new SQSMessageQueueService();
    const eventService = new EventService(messageQueueService);
    const eventController = new EventController(eventService);

    this.services.set('messageQueueService', messageQueueService);
    this.services.set('eventService', eventService);
    this.services.set('eventController', eventController);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }

  getEventController(): EventController {
    return this.get<EventController>('eventController');
  }

  getEventService(): EventService {
    return this.get<EventService>('eventService');
  }

  getMessageQueueService(): SQSMessageQueueService {
    return this.get<SQSMessageQueueService>('messageQueueService');
  }
}
