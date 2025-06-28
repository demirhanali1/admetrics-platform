import { Event, EventService as IEventService, EventValidator, MessageQueueService, SQSMessageResult } from '../types/Event';
import { EventValidator as EventValidatorClass } from '../validators/eventValidator';

export class EventService implements IEventService {
  private readonly validator: EventValidator;
  private readonly messageQueueService: MessageQueueService;

  constructor(messageQueueService: MessageQueueService) {
    this.validator = new EventValidatorClass();
    this.messageQueueService = messageQueueService;
  }

  async processEvent(event: Event): Promise<SQSMessageResult> {
    const validation = this.validator.validate(event);

    if (!validation.isValid) {
      return {
        messageId: '',
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    try {
      return await this.messageQueueService.sendMessage(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        messageId: '',
        success: false,
        error: errorMessage
      };
    }
  }
}
