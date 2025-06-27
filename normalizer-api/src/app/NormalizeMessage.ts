import {RawEvent} from "../domain/RawEvent";
import {normalizeMeta} from "../normalizers/normalizeMeta";
import {normalizeGoogle} from "../normalizers/normalizeGoogle";
import {saveRawEvent} from "../db/MongoClient";
import {saveNormalizedEvent} from "../db/PostgresClient";

export const NormalizeMessage = async (payload: RawEvent) => {
    try {
        const source = payload.source;

        await saveRawEvent(payload);
        console.log("Raw event saved to MongoDB");

        let normalized;

        switch (source) {
            case "meta":
                normalized = normalizeMeta(payload.payload);
                break;

            case "google":
                normalized = normalizeGoogle(payload.payload);
                break;

            default:
                throw new Error(`Unknown source platform: ${source}`);
        }

        await saveNormalizedEvent(normalized);
        console.log("Normalized event saved to PostgreSQL");

    } catch (err) {
        console.error(`NormalizeMessage failed: ${err}`);
        throw new Error(err);
    }
};
