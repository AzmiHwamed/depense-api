-- Metered AI token wallet. Run this in production before deploying the API.
ALTER TABLE users
  ADD COLUMN tokenBalance INT NOT NULL DEFAULT 30;

ALTER TABLE payment_plans
  ADD COLUMN tokenCount INT NOT NULL DEFAULT 1;

ALTER TABLE payment_plans
  MODIFY COLUMN durationMonths INT NOT NULL DEFAULT 0;

ALTER TABLE payments
  ADD COLUMN tokenCount INT NOT NULL DEFAULT 0;

CREATE TABLE ai_service_prices (
  id CHAR(36) NOT NULL,
  service VARCHAR(64) NOT NULL,
  tokenCost INT NOT NULL,
  createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY UQ_ai_service_prices_service (service)
);

INSERT INTO ai_service_prices (id, service, tokenCost)
VALUES
  (UUID(), 'receiptScan', 3),
  (UUID(), 'interpreterTurn', 5),
  (UUID(), 'textTranslation', 1);

-- New checkouts persist their quantity at creation time. The API also has a
-- one-time legacy fallback for a pending checkout that predates this column.

-- Configure every existing payment package with its intended token amount
-- before enabling it for purchase. The old durationMonths field is retained
-- only for historic data and is no longer used by the application.
