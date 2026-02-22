BEGIN;

-- Dedupe existing records to avoid unique-index creation failure.
DELETE FROM usage_events a
USING usage_events b
WHERE a.ctid < b.ctid
  AND a."jobId" = b."jobId";

DELETE FROM billing_ledger a
USING billing_ledger b
WHERE a.ctid < b.ctid
  AND a."jobId" = b."jobId";

CREATE UNIQUE INDEX IF NOT EXISTS usage_events_job_id_uidx
  ON usage_events ("jobId");

CREATE UNIQUE INDEX IF NOT EXISTS billing_ledger_job_id_uidx
  ON billing_ledger ("jobId");

COMMIT;
