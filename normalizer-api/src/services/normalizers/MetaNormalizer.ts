import { EventNormalizer, NormalizedEvent, EventPayload } from '../../types/Event';

export class MetaNormalizer implements EventNormalizer {
  normalize(payload: EventPayload): NormalizedEvent {
    // Meta payload structure
    const campaignId = payload.campaign_id as string;
    const campaignName = payload.campaign_name as string;
    const insights = payload.insights as Record<string, unknown>;

    if (!campaignId) {
      throw new Error('Invalid Meta payload: missing campaign_id');
    }

    if (!insights) {
      throw new Error('Invalid Meta payload: missing insights');
    }

    return {
      unified_campaign_id: campaignId,
      campaign_name: campaignName || 'Unknown Campaign',
      source_platform: 'meta',
      event_date: (payload.date_start as string) || new Date().toISOString().split('T')[0],
      impressions: Number(insights.impressions) || 0,
      clicks: Number(insights.clicks) || 0,
      spend: Number(insights.spend) || 0,
      conversions: Number(insights.conversions) || 0
    };
  }
} 