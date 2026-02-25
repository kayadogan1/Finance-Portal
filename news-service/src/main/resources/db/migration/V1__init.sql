CREATE TABLE news_articles(
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    published_date TIMESTAMP,
    source_name VARCHAR(100),
    url VARCHAR(500),
    author_name VARCHAR(100),
    topic VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL
);
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