import { EventService } from '../services/EventService';
import { Event } from '../types/Event';
import { MessageQueueService } from '../types/Event';

jest.mock('../validators/eventValidator');

const mockValidate = jest.fn();
jest.mock('../validators/eventValidator', () => ({
  EventValidator: jest.fn().mockImplementation(() => ({
    validate: mockValidate,
  })),
}));

describe('EventService', () => {
  let eventService: EventService;
  let mockMessageQueueService: jest.Mocked<MessageQueueService>;

  beforeEach(() => {
    mockMessageQueueService = {
      sendMessage: jest.fn(),
    } as any;

    eventService = new EventService(mockMessageQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvent', () => {
    it('should successfully process a valid event', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
        timestamp: '2023-01-01T00:00:00Z',
        id: 'test-id',
      };

      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMessageQueueService.sendMessage.mockResolvedValue({
        messageId: 'msg-123',
        success: true,
      });

      // Act
      const result = await eventService.processEvent(validEvent);

      // Assert
      expect(mockMessageQueueService.sendMessage).toHaveBeenCalledWith(validEvent);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
    });

    it('should handle message queue failures', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
      };

      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMessageQueueService.sendMessage.mockResolvedValue({
        messageId: '',
        success: false,
        error: 'Queue error',
      });

      // Act
      const result = await eventService.processEvent(validEvent);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue error');
    });

    it('should handle service exceptions', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
      };

      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMessageQueueService.sendMessage.mockRejectedValue(
        new Error('Service exception')
      );

      // Act
      const result = await eventService.processEvent(validEvent);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service exception');
    });

    it('should handle validation failures', async () => {
      // Arrange
      const invalidEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
      };

      mockValidate.mockReturnValue({
        isValid: false,
        errors: ['Invalid source'],
      });

      // Act
      const result = await eventService.processEvent(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics after processing events', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
      };

      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMessageQueueService.sendMessage.mockResolvedValue({
        messageId: 'msg-123',
        success: true,
      });

      // Act
      await eventService.processEvent(validEvent);
      await eventService.processEvent(validEvent);
      const metrics = eventService.getMetrics();

      // Assert
      expect(metrics.processedCount).toBe(2);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.eventsPerSecond).toBeGreaterThanOrEqual(0);
      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeDefined();
    });

    it('should calculate success rate correctly with errors', async () => {
      // Arrange
      const validEvent: Event = {
        source: 'test-source',
        payload: { key: 'value' },
      };

      mockValidate.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockMessageQueueService.sendMessage
        .mockResolvedValueOnce({
          messageId: 'msg-123',
          success: true,
        })
        .mockResolvedValueOnce({
          messageId: '',
          success: false,
          error: 'Error',
        });

      // Act
      await eventService.processEvent(validEvent);
      await eventService.processEvent(validEvent);
      const metrics = eventService.getMetrics();

      // Assert
      expect(metrics.processedCount).toBe(1);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.successRate).toBe(50);
    });
  });

  describe('shutdown', () => {
    it('should call shutdown on message queue service', async () => {
      // Arrange
      const mockShutdown = jest.fn().mockResolvedValue(undefined);
      (mockMessageQueueService as any).shutdown = mockShutdown;

      // Act
      await eventService.shutdown();

      // Assert
      expect(mockShutdown).toHaveBeenCalled();
    });

    it('should handle shutdown gracefully when service has no shutdown method', async () => {
      // Act & Assert
      await expect(eventService.shutdown()).resolves.not.toThrow();
    });
  });
});
