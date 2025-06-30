import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.SQS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

jest.setTimeout(10000);
