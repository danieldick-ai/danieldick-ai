CREATE TABLE IF NOT EXISTS portfolio_webhook_replay_guard (
    nonce VARCHAR(128) PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_webhook_replay_guard_received_at
    ON portfolio_webhook_replay_guard (received_at);
