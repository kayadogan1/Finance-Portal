CREATE TABLE users(
    id VARCHAR(255) PRIMARY KEY,


    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    surname VARCHAR NOT NULL,
    phone_number VARCHAR,
    risk_tolerance VARCHAR(50) DEFAULT 'UNDEFINED',

    preferred_currency VARCHAR(3) DEFAULT 'TRY',

    subscription_type VARCHAR(50) DEFAULT 'FREE',

    is_frozen BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

ALTER TABLE portfolios
    ADD CONSTRAINT fk_portfolio_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE;

ALTER TABLE user_favorite_instruments
    ADD CONSTRAINT fk_favorite_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE;

ALTER TABLE user_favorite_instruments
    ADD CONSTRAINT fk_favorite_instrument
    FOREIGN KEY (instrument_id)
    REFERENCES instruments (id)
    ON DELETE CASCADE;