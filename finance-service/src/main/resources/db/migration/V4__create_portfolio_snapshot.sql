DROP TABLE IF EXISTS portfolio_snapshots CASCADE;
DROP TABLE IF EXISTS daily_portfolio_snapshots CASCADE;

CREATE TABLE daily_portfolio_snapshots (
     id UUID PRIMARY KEY,
     portfolio_id UUID NOT NULL,
     snapshot_date DATE NOT NULL,

     total_value DECIMAL(19, 2),
     cash_balance DECIMAL(19, 2),
     investment_value DECIMAL(19, 2),

     CONSTRAINT fk_snapshot_portfolio
         FOREIGN KEY (portfolio_id)
         REFERENCES portfolios (id)
         ON DELETE CASCADE,

     CONSTRAINT uq_portfolio_date
         UNIQUE (portfolio_id, snapshot_date)
);