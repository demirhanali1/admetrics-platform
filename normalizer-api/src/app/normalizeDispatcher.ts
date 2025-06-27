import { NormalizedEvent } from "../domain/NormalizedEvent";
import {normalizeMeta} from "../normalizers/normalizeMeta";
import {normalizeGoogle} from "../normalizers/normalizeGoogle";

type Payload = any;

const normalizerMap: Record<string, (payload: Payload) => NormalizedEvent> = {
    meta: normalizeMeta,
    google: normalizeGoogle,
};

export const normalizeDispatcher = (source: string, payload: Payload): NormalizedEvent => {
    const normalizer = normalizerMap[source];

    if (!normalizer) {
        throw new Error(`normalizeDispatcher error: unknown source '${source}'`);
    }

    return normalizer(payload);
};
