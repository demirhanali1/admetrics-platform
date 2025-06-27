import {NormalizedEvent} from "../domain/NormalizedEvent";

export const normalizeGoogle = (payload: any): NormalizedEvent => {
    return {
        unified_campaign_id: payload.campaign.resource_name.split("/").pop(),
        campaign_name: payload.campaign.name,
        source_platform: "google",
        event_date: payload.metrics.date,
        impressions: payload.metrics.impressions,
        clicks: payload.metrics.clicks,
        spend: payload.metrics.cost_micros / 1_000_000,
        conversions: payload.metrics.conversions
    };
};
