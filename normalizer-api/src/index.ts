import { config } from "dotenv";
import { startSqsConsumer } from "./services/sqs/sqsConsumer";
import { AppDataSource } from "./db/data-source";

config();

(async () => {
    try {
        console.log("Normalizer API starting...");

        await AppDataSource.initialize(); // <-- burada await gerekli
        console.log("TypeORM connected to PostgreSQL");

        await startSqsConsumer();
    } catch (error) {
        console.error("Failed to start Normalizer API:", error);
        process.exit(1);
    }
})();
