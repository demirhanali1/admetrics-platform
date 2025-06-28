import { EventNormalizer, NormalizedEvent, EventPayload } from '../../types/Event';

export class MetaNormalizer implements EventNormalizer {
  normalize(payload: EventPayload): NormalizedEvent {
    const campaign = payload.campaign as Record<string, unknown>;
    const metrics = payload.metrics as Record<string, unknown>;

    if (!campaign || !metrics) {
      throw new Error('Invalid Meta payload structure: missing campaign or metrics');
    }

    const campaignId = campaign.id as string;
    if (!campaignId) {
      throw new Error('Invalid Meta payload: missing campaign.id');
    }

    return {
      unified_campaign_id: campaignId,
      campaign_name: (campaign.name as string) || 'Unknown Campaign',
      source_platform: 'meta',
      event_date: (metrics.date as string) || new Date().toISOString().split('T')[0],
      impressions: Number(metrics.impressions) || 0,
      clicks: Number(metrics.clicks) || 0,
      spend: Number(metrics.spend) || 0,
      conversions: Number(metrics.conversions) || 0
    };
  }
} 