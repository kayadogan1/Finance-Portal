ALTER TABLE news_articles ADD CONSTRAINT uk_news_articles_url UNIQUE (url);

ALTER TABLE news_articles ADD COLUMN description TEXT;
ALTER TABLE news_articles ADD COLUMN url_to_image TEXT;