CREATE TABLE IF NOT EXISTS casino_users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance INTEGER NOT NULL DEFAULT 1000,
    spins INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    biggest INTEGER NOT NULL DEFAULT 0,
    token VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_casino_users_login ON casino_users(login);
CREATE INDEX IF NOT EXISTS idx_casino_users_token ON casino_users(token);