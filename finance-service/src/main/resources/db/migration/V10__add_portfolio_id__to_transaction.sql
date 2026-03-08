ALTER TABLE transactions
    ADD COLUMN portfolio_id UUID NOT NULL
      REFERENCES portfolios(id);