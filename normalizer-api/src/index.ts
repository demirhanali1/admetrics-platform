import { config } from "dotenv";
import { DIContainer } from './container/DIContainer';

// Load environment variables
config();

(async () => {
    try {
        console.log("Normalizer API starting...");

        // Get services from DI container
        const container = DIContainer.getInstance();
        const eventProcessor = container.getEventProcessor();
        const sqsConsumer = container.getSQSConsumer();

        // Initialize event processor (connects to databases)
        await eventProcessor.initialize();

        // Start SQS consumer
        await sqsConsumer.startConsuming();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Failed to start Normalizer API:", errorMessage);
        process.exit(1);
    }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try {
        const container = DIContainer.getInstance();
        const eventProcessor = container.getEventProcessor();
        const sqsConsumer = container.getSQSConsumer();

        await sqsConsumer.stopConsuming();
        await eventProcessor.shutdown();
        
        console.log('Normalizer API shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    try {
        const container = DIContainer.getInstance();
        const eventProcessor = container.getEventProcessor();
        const sqsConsumer = container.getSQSConsumer();

        await sqsConsumer.stopConsuming();
        await eventProcessor.shutdown();
        
        console.log('Normalizer API shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});
