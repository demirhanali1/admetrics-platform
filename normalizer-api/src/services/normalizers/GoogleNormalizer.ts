import { EventNormalizer, NormalizedEvent, RawEvent } from '../../types/Event';

export class GoogleNormalizer implements EventNormalizer {
  normalize(event: RawEvent): NormalizedEvent {
    const payload = event.payload;
    const campaign = payload.campaign as Record<string, unknown>;
    const metrics = payload.metrics as Record<string, unknown>;

    if (!campaign || !metrics) {
      throw new Error('Invalid Google payload structure: missing campaign or metrics');
    }

    const resourceName = campaign.resource_name as string;
    if (!resourceName) {
      throw new Error('Invalid Google payload: missing campaign.resource_name');
    }

    const campaignId = resourceName.split('/').pop();
    if (!campaignId) {
      throw new Error('Invalid Google payload: could not extract campaign ID from resource_name');
    }

    return {
      unified_campaign_id: campaignId,
      campaign_name: (campaign.name as string) || 'Unknown Campaign',
      source_platform: 'google',
      event_date: (metrics.date as string) || new Date().toISOString().split('T')[0],
      impressions: Number(metrics.impressions) || 0,
      clicks: Number(metrics.clicks) || 0,
      spend: Number(metrics.cost_micros) / 1_000_000 || 0,
      conversions: Number(metrics.conversions) || 0
    };
  }
} 