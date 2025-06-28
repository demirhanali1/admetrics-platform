# Normalizer API

A TypeScript-based event normalization service that consumes messages from SQS, saves raw events to MongoDB, normalizes them, and stores normalized events in PostgreSQL using TypeORM.

## Architecture Overview

This API has been refactored to follow SOLID principles:

### 1. Single Responsibility Principle (SRP)
- **EventProcessorService**: Orchestrates the entire event processing workflow
- **SQSConsumerService**: Handles SQS message consumption
- **MongoDBService**: Manages MongoDB operations for raw events
- **PostgreSQLService**: Manages PostgreSQL operations for normalized events
- **GoogleNormalizer/MetaNormalizer**: Handle platform-specific normalization
- **Config**: Manages application configuration

### 2. Open/Closed Principle (OCP)
- Services implement interfaces, allowing extension without modification
- New normalizers can be added by implementing `EventNormalizer`
- New database providers can be added by implementing `DatabaseService`

### 3. Liskov Substitution Principle (LSP)
- All implementations can be substituted for their interfaces
- Services are interchangeable as long as they implement the required interfaces

### 4. Interface Segregation Principle (ISP)
- Interfaces are specific and focused:
  - `EventProcessor`: Event processing orchestration
  - `MessageConsumerService`: SQS message consumption
  - `DatabaseService`: Database operations
  - `EventNormalizer`: Event normalization

### 5. Dependency Inversion Principle (DIP)
- High-level modules depend on abstractions, not concrete implementations
- Dependency injection container manages service dependencies
- Services depend on interfaces rather than concrete classes

## Project Structure

```
src/
├── config/
│   └── Config.ts                    # Application configuration
├── container/
│   └── DIContainer.ts               # Dependency injection container
├── entities/
│   └── NormalizedEvent.ts           # TypeORM entity for PostgreSQL
├── services/
│   ├── EventProcessor.ts            # Main event processing orchestration
│   ├── database/
│   │   ├── MongoDBService.ts        # MongoDB operations
│   │   └── PostgreSQLService.ts     # PostgreSQL operations
│   ├── normalizers/
│   │   ├── GoogleNormalizer.ts      # Google Ads normalization
│   │   ├── MetaNormalizer.ts        # Meta Ads normalization
│   │   └── EventNormalizerFactory.ts # Normalizer factory
│   └── sqs/
│       └── SQSConsumerService.ts    # SQS message consumption
├── types/
│   └── Event.ts                     # TypeScript interfaces
└── index.ts                         # Application entry point
```

## Key Features

- **Type Safety**: No `any` types used, strict TypeScript configuration
- **SOLID Principles**: Clean architecture following SOLID principles
- **Dependency Injection**: Clean dependency management
- **Error Handling**: Comprehensive error handling with proper logging
- **Database Integration**: MongoDB for raw events, PostgreSQL for normalized events
- **Platform Support**: Google Ads and Meta Ads normalization
- **Graceful Shutdown**: Proper cleanup on application termination

## Environment Variables

Required environment variables:
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `SQS_QUEUE_URL`: SQS queue URL
- `MONGO_URI`: MongoDB connection string
- `POSTGRES_HOST`: PostgreSQL host (default: localhost)
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)
- `POSTGRES_USERNAME`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DATABASE`: PostgreSQL database name
- `NODE_ENV`: Environment (default: development)
- `LOG_LEVEL`: Log level (default: info)

## Event Processing Flow

1. **SQS Message Consumption**: Continuously polls SQS for new messages
2. **Raw Event Storage**: Saves raw event data to MongoDB
3. **Event Normalization**: Normalizes events based on source platform
4. **Normalized Event Storage**: Saves normalized events to PostgreSQL
5. **Message Acknowledgment**: Deletes processed messages from SQS

## Supported Platforms

### Google Ads
- Extracts campaign ID from `resource_name`
- Converts cost from micros to standard currency
- Maps Google-specific metrics to unified format

### Meta Ads
- Uses campaign ID directly
- Maps Meta-specific metrics to unified format

## Normalized Event Schema

```typescript
interface NormalizedEvent {
  unified_campaign_id: string;
  campaign_name: string;
  source_platform: string;
  event_date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Database Setup

### MongoDB
- Automatically creates collections
- Stores raw events with flexible schema
- Includes timestamps and metadata

### PostgreSQL
- Uses TypeORM for schema management
- Creates `normalized_events` table
- Supports JSONB for flexible data storage

## Error Handling

- **SQS Errors**: Logged and retried with exponential backoff
- **Database Errors**: Detailed error messages with context
- **Normalization Errors**: Platform-specific error handling
- **Graceful Shutdown**: Proper cleanup of resources

## Monitoring and Logging

- Request/response logging
- Error tracking with stack traces
- Database connection status
- SQS message processing metrics

## SOLID Principles Implementation

1. **Single Responsibility**: Each class has one reason to change
2. **Open/Closed**: Easy to extend with new normalizers and databases
3. **Liskov Substitution**: All implementations are interchangeable
4. **Interface Segregation**: Focused, specific interfaces
5. **Dependency Inversion**: Depend on abstractions, not concretions 