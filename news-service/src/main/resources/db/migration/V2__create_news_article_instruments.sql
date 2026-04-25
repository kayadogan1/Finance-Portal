CREATE TABLE news_article_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_article_id UUID NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    asset_type VARCHAR(50),
    score VARCHAR(50),
    rank_order INTEGER NOT NULL,
    primary_match BOOLEAN NOT NULL DEFAULT FALSE,
    match_source VARCHAR(50),

    CONSTRAINT fk_news_article_instruments_article
        FOREIGN KEY (news_article_id)
        REFERENCES news_articles (id)
        ON DELETE CASCADE,

    CONSTRAINT uk_news_article_instruments_article_symbol
        UNIQUE (news_article_id, symbol)
);

CREATE INDEX idx_news_article_instruments_symbol
    ON news_article_instruments (symbol);

CREATE INDEX idx_news_article_instruments_article
    ON news_article_instruments (news_article_id);
