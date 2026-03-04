ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ALTER COLUMN type TYPE VARCHAR(255);
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW'));