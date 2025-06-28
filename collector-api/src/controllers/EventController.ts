import { Request, Response } from 'express';
import { Event, EventService } from '../types/Event';
import { EventService as EventServiceClass } from '../services/EventService';
import { EventValidator } from '../validators/EventValidator';

export class EventController {
  private readonly eventService: EventService;
  private readonly validator: EventValidator;

  constructor(eventService: EventService) {
    this.eventService = eventService;
    this.validator = new EventValidator();
  }

  async handleEventPost(req: Request, res: Response): Promise<void> {
    try {
      const validation = this.validator.validateAndTransform(req.body);
      
      if (!validation.isValid) {
        res.status(400).json({ 
          error: 'Invalid request body', 
          details: validation.errors 
        });
        return;
      }

      const event = validation.event as Event;
      const result = await this.eventService.processEvent(event);

      if (result.success) {
        res.status(200).json({ 
          message: 'Event processed successfully', 
          messageId: result.messageId 
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to process event', 
          details: result.error 
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error processing event:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        details: errorMessage 
      });
    }
  }
} 