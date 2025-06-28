import { config } from "dotenv";
import { Config } from './config/Config';
import app from "./app";

// Load environment variables
config();

const configInstance = Config.getInstance();
const appConfig = configInstance.getConfig();

const port = appConfig.port;

app.listen(port, () => {
    console.log(`Collector API running on http://localhost:${port}`);
    console.log(`Environment: ${appConfig.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
