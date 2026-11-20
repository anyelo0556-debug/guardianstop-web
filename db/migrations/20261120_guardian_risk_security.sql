-- Guardian Stop risk/security compatibility migration.
-- Review and run once against the TiDB database before deploying the application code.

ALTER TABLE account_credentials
  MODIFY COLUMN igApiKey TEXT NULL,
  MODIFY COLUMN derivApiToken TEXT NULL;

UPDATE accounts
SET dailyLimitPct = 1.00
WHERE dailyLimitPct NOT IN (1.00, 2.00, 3.00);

UPDATE accounts
SET weeklyLimitPct = 10.00;

UPDATE accounts
SET monthlyLimitPct = 20.00;
