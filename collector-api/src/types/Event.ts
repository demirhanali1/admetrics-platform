export interface EventPayload {
  [key: string]: unknown;
}

export interface Event {
  source: string;
  payload: EventPayload;
  timestamp?: string;
  id?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SQSMessageResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export interface EventService {
  processEvent(event: Event): Promise<SQSMessageResult>;
}

export interface EventValidator {
  validate(event: unknown): ValidationResult;
}

export interface MessageQueueService {
  sendMessage(message: Event): Promise<SQSMessageResult>;
} 