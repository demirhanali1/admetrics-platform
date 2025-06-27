import {RawEvent} from "../domain/RawEvent";
import {saveRawEvent} from "../db/MongoClient";
import {saveNormalizedEvent} from "../db/PostgresClient";
import {normalizeDispatcher} from "./normalizeDispatcher";

export const NormalizeMessage = async (payload: RawEvent) => {
    try {
        await saveRawEvent(payload);
        console.log("Raw event saved to MongoDB");

        const normalized = normalizeDispatcher(payload.source, payload.payload);
        await saveNormalizedEvent(normalized);
        console.log("Normalized event saved to PostgreSQL");

    } catch (err) {
        console.error(`NormalizeMessage error: ${err}`);
        throw err;
    }
};
