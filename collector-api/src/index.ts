import { config } from "dotenv";
import { Config } from './config/Config';
import app from "./app";
import { DIContainer } from './container/DIContainer';

// Load environment variables
config();

const configInstance = Config.getInstance();
const appConfig = configInstance.getConfig();

const port = appConfig.port;

// Performance optimizations
process.setMaxListeners(0); // Remove listener limit
process.env.UV_THREADPOOL_SIZE = '64'; // Increase thread pool size

const server = app.listen(port, () => {
    console.log(`🚀 Collector API starting on port ${port} with high-throughput optimizations`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Node.js version: ${process.version}`);
    console.log(`💾 Memory: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    try {
        // Stop accepting new connections
        server.close(() => {
            console.log('✅ HTTP server closed');
        });

        // Shutdown services
        const container = DIContainer.getInstance();
        const eventService = container.getEventService();
        
        await eventService.shutdown();
        
        console.log('✅ All services shut down successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Memory monitoring
setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    };
    
    if (memUsageMB.heapUsed > 1000) { // Log if memory usage > 1GB
        console.log(`⚠️  High memory usage: ${JSON.stringify(memUsageMB)} MB`);
    }
}, 60000); // Check every minute
