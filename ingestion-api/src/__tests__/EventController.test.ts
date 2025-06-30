import { EventController } from '../controllers/EventController';
import { EventService } from '../services/EventService';
import { Event } from '../types/Event';
import { Request, Response } from 'express';

jest.mock('../services/EventService');
jest.mock('../validators/eventValidator');

const mockValidateAndTransform = jest.fn();
jest.mock('../validators/eventValidator', () => ({
  EventValidator: jest.fn().mockImplementation(() => ({
    validateAndTransform: mockValidateAndTransform,
  })),
}));

describe('EventController', () => {
  let eventController: EventController;
  let mockEventService: jest.Mocked<EventService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockEventService = {
      processEvent: jest.fn(),
    } as any;

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    eventController = new EventController(mockEventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleEventPost', () => {
    it('should successfully process a valid event', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
        timestamp: '2023-01-01T00:00:00Z',
        id: 'test-id',
      };

      mockRequest.body = validEvent;
      mockValidateAndTransform.mockReturnValue({
        isValid: true,
        event: validEvent,
        errors: [],
      });
      mockEventService.processEvent.mockResolvedValue({
        messageId: 'msg-123',
        success: true,
      });

      // Act
      await eventController.handleEventPost(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockEventService.processEvent).toHaveBeenCalledWith(validEvent);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Event processed successfully',
        messageId: 'msg-123',
      });
    });

    it('should return 400 for invalid event data', async () => {
      // Arrange
      mockRequest.body = { invalid: 'data' };
      mockValidateAndTransform.mockReturnValue({
        isValid: false,
        errors: ['Invalid source', 'Invalid payload'],
      });

      // Act
      await eventController.handleEventPost(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid request body',
        details: ['Invalid source', 'Invalid payload'],
      });
    });

    it('should return 500 when event processing fails', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
      };

      mockRequest.body = validEvent;
      mockValidateAndTransform.mockReturnValue({
        isValid: true,
        event: validEvent,
        errors: [],
      });
      mockEventService.processEvent.mockResolvedValue({
        messageId: '',
        success: false,
        error: 'Processing failed',
      });

      // Act
      await eventController.handleEventPost(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to process event',
        details: 'Processing failed',
      });
    });

    it('should handle service exceptions gracefully', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
      };

      mockRequest.body = validEvent;
      mockValidateAndTransform.mockReturnValue({
        isValid: true,
        event: validEvent,
        errors: [],
      });
      mockEventService.processEvent.mockRejectedValue(
        new Error('Service error')
      );

      // Act
      await eventController.handleEventPost(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Service error',
      });
    });
  });
});
