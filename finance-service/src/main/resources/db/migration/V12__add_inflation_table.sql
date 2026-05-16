CREATE SEQUENCE IF NOT EXISTS inflation_seq START WITH 1 INCREMENT BY 50;

CREATE TABLE inflation (
    id BIGINT NOT NULL,
    rate DOUBLE PRECISION,
    associated_country VARCHAR(50) NOT NULL,
    timestamp DATE,
    CONSTRAINT pk_inflation PRIMARY KEY (id)
);