import {NormalizedEvent} from "../domain/NormalizedEvent";

export const normalizeMeta = (payload: any): NormalizedEvent => {
    return {
        unified_campaign_id: payload.campaign_id,
        campaign_name: payload.campaign_name,
        source_platform: "meta",
        event_date: payload.date_start, // Tek günlü kampanya olduğu varsayılıyor
        impressions: payload.insights.impressions,
        clicks: payload.insights.clicks,
        spend: payload.insights.spend,
        conversions: payload.insights.conversions
    };
};
