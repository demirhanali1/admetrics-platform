export interface NormalizedEvent {
    unified_campaign_id: string;
    campaign_name: string;
    source_platform: string;
    event_date: string; // ISO formatlı tarih
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
}
