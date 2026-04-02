DROP TABLE IF EXISTS phone_risk_signals CASCADE;
DROP TABLE IF EXISTS scam_patterns CASCADE;

CREATE TABLE scam_patterns (
  id           SERIAL PRIMARY KEY,
  category     VARCHAR(50)  NOT NULL,
  region       VARCHAR(50)  NOT NULL DEFAULT 'global',
  pattern_text TEXT         NOT NULL,
  example      TEXT,
  source       VARCHAR(100) NOT NULL DEFAULT 'manual',
  confidence   INTEGER      NOT NULL DEFAULT 80 CHECK (confidence BETWEEN 0 AND 100),
  active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patterns_category_region
  ON scam_patterns (category, region)
  WHERE active = TRUE;

CREATE INDEX idx_patterns_confidence
  ON scam_patterns (confidence DESC)
  WHERE active = TRUE;

CREATE TABLE phone_risk_signals (
  id          SERIAL PRIMARY KEY,
  prefix      VARCHAR(20)  NOT NULL,
  region      VARCHAR(50),
  risk_level  SMALLINT     NOT NULL DEFAULT 2 CHECK (risk_level BETWEEN 1 AND 3),
  line_type   VARCHAR(20),
  notes       TEXT,
  source      VARCHAR(100) NOT NULL DEFAULT 'manual',
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_prefix
  ON phone_risk_signals (prefix)
  WHERE active = TRUE;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scam_patterns_updated_at
  BEFORE UPDATE ON scam_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();