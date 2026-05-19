ALTER TABLE inflation
ADD CONSTRAINT uq_country_date
UNIQUE (associated_country, timestamp);