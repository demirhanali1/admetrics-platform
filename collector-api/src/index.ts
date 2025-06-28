import { config } from "dotenv";
import { Config } from './config/Config';
import app from "./app";
import { DIContainer } from './container/DIContainer';

config();

const configInstance = Config.getInstance();
const appConfig = configInstance.getConfig();

const port = appConfig.port;

process.setMaxListeners(0);
process.env.UV_THREADPOOL_SIZE = '64';

const server = app.listen(port, () => {
    console.log(`Collector API starting on port ${port} with high-throughput optimizations`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Memory: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
});

const gracefulShutdown = async (signal: string) => {
    console.log(`\n Received ${signal}. Starting graceful shutdown...`);

    try {
        server.close(() => {
            console.log('HTTP server closed');
        });

        const container = DIContainer.getInstance();
        const eventService = container.getEventService();

        await eventService.shutdown();

        console.log('All services shut down successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    };

    if (memUsageMB.heapUsed > 1000) {
        console.log(`High memory usage: ${JSON.stringify(memUsageMB)} MB`);
    }
}, 60000);
