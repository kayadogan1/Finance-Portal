ALTER TABLE market_data
ADD CONSTRAINT uq_market_data_instrument_timestamp
UNIQUE (instrument_id, timestamp);
ALTER TABLE instruments ADD COLUMN historical_data_loaded BOOLEAN DEFAULT FALSE;