ALTER TABLE instruments
ADD COLUMN base_currency VARCHAR(10);

UPDATE instruments
SET base_currency = 'TRY'
WHERE base_currency IS NULL;

ALTER TABLE instruments
ALTER COLUMN base_currency SET NOT NULL;