import { config } from "dotenv";
import {startSqsConsumer} from "./services/sqs/sqsConsumer";

config();

(async () => {
    try {
        console.log("Normalizer API starting...");
        await startSqsConsumer();
    } catch (error) {
        console.error("Failed to start Normalizer API:", error);
        process.exit(1);
    }
})();
