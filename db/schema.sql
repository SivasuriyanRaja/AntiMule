-- ──────────────────────────────────────────────────────────────
-- AntiMule — MySQL Schema
-- Run once:  mysql -u root -p < db/schema.sql
-- ──────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS antimule
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE antimule;

CREATE TABLE IF NOT EXISTS predictions (
  id                    INT          NOT NULL AUTO_INCREMENT,
  f115                  FLOAT,
  f321                  FLOAT,
  f670                  FLOAT,
  f3836                 FLOAT,
  f3894                 FLOAT,
  f3891                 VARCHAR(50),
  ml_probability        FLOAT        NOT NULL,
  anomaly_score         FLOAT,
  composite_probability FLOAT        NOT NULL,
  risk_score            INT          NOT NULL,
  risk_tier             VARCHAR(10)  NOT NULL,
  prediction            TINYINT      NOT NULL,
  prediction_label      VARCHAR(30),
  confidence            FLOAT,
  alerts                JSON,
  full_account_data     JSON,
  source                VARCHAR(20)  DEFAULT 'api',
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_prediction  (prediction),
  INDEX idx_risk_tier   (risk_tier),
  INDEX idx_risk_score  (risk_score DESC),
  INDEX idx_created_at  (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS batch_scans (
  id              INT         NOT NULL AUTO_INCREMENT,
  scan_id         VARCHAR(36) NOT NULL UNIQUE,
  total           INT,
  mule_count      INT,
  legit_count     INT,
  mule_pct        FLOAT,
  avg_risk_score  FLOAT,
  tier_breakdown  JSON,
  source          VARCHAR(20) DEFAULT 'api',
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_scan_id    (scan_id),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alerts (
  id             INT         NOT NULL AUTO_INCREMENT,
  prediction_id  INT,
  risk_score     INT,
  risk_tier      VARCHAR(10),
  ml_probability FLOAT,
  alert_reason   TEXT,
  acknowledged   TINYINT(1)  NOT NULL DEFAULT 0,
  created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ack        (acknowledged),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS model_runs (
  id         INT      NOT NULL AUTO_INCREMENT,
  metrics    JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SHOW TABLES;
