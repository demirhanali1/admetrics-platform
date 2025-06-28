# Collector API

A TypeScript-based event collection API built with Express.js, following SOLID principles and best practices.

## Architecture Overview

This API has been refactored to follow SOLID principles:

### 1. Single Responsibility Principle (SRP)
- **EventController**: Handles HTTP requests and responses
- **EventService**: Orchestrates event processing logic
- **EventValidator**: Validates event data
- **SQSMessageQueueService**: Handles SQS message operations
- **Config**: Manages application configuration

### 2. Open/Closed Principle (OCP)
- Services implement interfaces, allowing extension without modification
- New message queue providers can be added by implementing `MessageQueueService`
- New validators can be added by implementing `EventValidator`

### 3. Liskov Substitution Principle (LSP)
- All implementations can be substituted for their interfaces
- Services are interchangeable as long as they implement the required interfaces

### 4. Interface Segregation Principle (ISP)
- Interfaces are specific and focused:
  - `EventService`: Event processing
  - `EventValidator`: Event validation
  - `MessageQueueService`: Message queue operations

### 5. Dependency Inversion Principle (DIP)
- High-level modules depend on abstractions, not concrete implementations
- Dependency injection container manages service dependencies
- Services depend on interfaces rather than concrete classes

## Project Structure

```
src/
├── config/
│   └── Config.ts              # Application configuration
├── container/
│   └── DIContainer.ts         # Dependency injection container
├── controllers/
│   └── EventController.ts     # HTTP request handlers
├── routes/
│   └── events.ts              # Express routes
├── services/
│   ├── EventService.ts        # Event processing logic
│   └── SQSMessageQueueService.ts # SQS integration
├── types/
│   └── Event.ts               # TypeScript interfaces
├── validators/
│   └── EventValidator.ts      # Event validation logic
├── app.ts                     # Express application setup
└── index.ts                   # Application entry point
```

## Key Features

- **Type Safety**: No `any` types used, strict TypeScript configuration
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Validation**: Robust input validation with detailed error messages
- **Configuration**: Centralized configuration management
- **Dependency Injection**: Clean dependency management
- **Logging**: Request logging and error tracking
- **Health Check**: Built-in health check endpoint

## Environment Variables

Required environment variables:
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `SQS_QUEUE_URL`: SQS queue URL
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (default: development)

## API Endpoints

### POST /events
Collects and processes events.

**Request Body:**
```json
{
  "source": "string",
  "payload": {
    "key": "value"
  },
  "timestamp": "2023-01-01T00:00:00Z",
  "id": "optional-event-id"
}
```

**Response:**
```json
{
  "message": "Event processed successfully",
  "messageId": "sqs-message-id"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00Z"
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

## SOLID Principles Implementation

1. **Single Responsibility**: Each class has one reason to change
2. **Open/Closed**: Easy to extend with new implementations
3. **Liskov Substitution**: All implementations are interchangeable
4. **Interface Segregation**: Focused, specific interfaces
5. **Dependency Inversion**: Depend on abstractions, not concretions 