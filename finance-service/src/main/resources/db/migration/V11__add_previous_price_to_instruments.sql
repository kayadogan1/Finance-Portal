ALTER TABLE instruments
ADD COLUMN previous_price NUMERIC(19, 4);

UPDATE instruments i
SET previous_price = md.price
FROM (
    SELECT DISTINCT ON (instrument_id)
           instrument_id,
           price
    FROM market_data
    WHERE timestamp < CURRENT_DATE
    ORDER BY instrument_id, timestamp DESC
) md
WHERE i.id = md.instrument_id
  AND i.previous_price IS NULL;

