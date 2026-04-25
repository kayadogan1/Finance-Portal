CREATE TABLE news_articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT,
    content         TEXT,
    description     TEXT,
    published_date  TIMESTAMP,
    source_name     VARCHAR(100),
    url             TEXT UNIQUE,
    url_to_image    TEXT,
    author_name     VARCHAR(100),
    topic           VARCHAR(50)  NOT NULL,
    country         VARCHAR(50)  NOT NULL,
    model_name      VARCHAR(100),
    instrument_symbol VARCHAR(50)
);
ALTER TABLE news_articles
    ADD CONSTRAINT uk_news_articles_url UNIQUE (url);
CREATE TABLE users (
    id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    user_name VARCHAR(255),
    email VARCHAR(255),

    CONSTRAINT pk_users PRIMARY KEY (id),

    CONSTRAINT uk_users_username UNIQUE (user_name),
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE user_favorite_topics (
    user_id VARCHAR(255) NOT NULL,
    favorite_topic VARCHAR(255),

    CONSTRAINT fk_user_favorite_topics_users
        FOREIGN KEY (user_id)
        REFERENCES users (id)
);