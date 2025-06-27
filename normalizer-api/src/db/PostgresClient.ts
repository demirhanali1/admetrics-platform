import { Pool } from "pg";
import {NormalizedEvent} from "../domain/NormalizedEvent";

const pool = new Pool({
    connectionString: process.env.POSTGRES_URI,
});

export const saveNormalizedEvent = async (data: NormalizedEvent) => {
    const query = `
    INSERT INTO normalized_events (
      unified_campaign_id,
      campaign_name,
      source_platform,
      event_date,
      impressions,
      clicks,
      spend,
      conversions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;

    const values = [
        data.unified_campaign_id,
        data.campaign_name,
        data.source_platform,
        data.event_date,
        data.impressions,
        data.clicks,
        data.spend,
        data.conversions,
    ];

    await pool.query(query, values);
};
