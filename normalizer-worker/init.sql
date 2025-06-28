CREATE TABLE IF NOT EXISTS normalized_events (
                                                 id SERIAL PRIMARY KEY,
    unified_campaign_id VARCHAR(100),
    campaign_name VARCHAR(255),
    source_platform VARCHAR(100),
    event_date DATE,
    impressions INTEGER,
    clicks INTEGER,
    spend NUMERIC,
    conversions INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
