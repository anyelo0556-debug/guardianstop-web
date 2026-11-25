-- Draft migration for durable broker-close intent recovery.
-- Review and apply only to an isolated test database first.
-- This file is NOT executed by CI and has NOT been applied to production.

CREATE TABLE IF NOT EXISTS risk_execution_intents (
  idempotencyKey VARCHAR(191) NOT NULL,
  accountId BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(64) NOT NULL,
  status ENUM('pending', 'confirmed') NOT NULL DEFAULT 'pending',
  attemptCount INT NOT NULL DEFAULT 0,
  lastAttemptAt TIMESTAMP NULL DEFAULT NULL,
  confirmedAt TIMESTAMP NULL DEFAULT NULL,
  lastErrorCode VARCHAR(64) NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (idempotencyKey),
  KEY risk_execution_intents_account_status_created_idx (accountId, status, createdAt),
  CONSTRAINT risk_execution_intents_account_fk
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
