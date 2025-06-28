export interface EventPayload {
  [key: string]: unknown;
}

export interface RawEvent {
  source: string;
  payload: EventPayload;
  timestamp?: string;
  id?: string;
  receivedAt: Date;
}

export interface NormalizedEvent {
  unified_campaign_id: string;
  campaign_name: string;
  source_platform: string;
  event_date: string; // ISO format date
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DatabaseResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface SQSMessage {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
}

export interface MessageConsumerService {
  startConsuming(): Promise<void>;
  stopConsuming(): Promise<void>;
}

export interface MessageProcessor {
  process(messageBody: string): Promise<void>;
}

export interface ConnectionPoolStatus {
  connected: boolean;
  poolSize: number;
  activeConnections: number;
  readyState?: number;
}

export interface DatabaseService {
  saveRawEvent(event: RawEvent): Promise<DatabaseResult>;
  saveNormalizedEvent(event: NormalizedEvent): Promise<DatabaseResult>;
  saveRawEvents?(events: RawEvent[]): Promise<DatabaseResult[]>;
  saveNormalizedEvents?(events: NormalizedEvent[]): Promise<DatabaseResult[]>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionPoolStatus?(): ConnectionPoolStatus;
}

export interface EventNormalizer {
  normalize(event: RawEvent): NormalizedEvent;
}

export interface EventNormalizerFactory {
  createNormalizer(source: string): EventNormalizer;
}

export interface EventProcessor {
  processEvent(event: RawEvent): Promise<boolean>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getSuccessRate(): number;
  getMetrics(): {
    processedCount: number;
    errorCount: number;
    successRate: number;
    batchSize: number;
    pendingBatchSize: number;
    concurrentBatches?: number;
    eventsPerSecond?: number;
  };
}

export interface SQSClientWrapper {
  receiveMessages(): Promise<SQSMessage[]>;
  deleteMessage(receiptHandle: string): Promise<void>;
}
