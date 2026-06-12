"""
db/mysql.py  —  AntiMule MySQL layer
Tables:
  predictions   — every scored account
  batch_scans   — batch summary metadata
  alerts        — high-risk auto-alerts
  model_runs    — training history

SQLAlchemy ORM — sync only (run_in_executor for async FastAPI calls).
Tables auto-created on first connect via create_tables().
"""

import os, json
from datetime import datetime, timezone
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import (
    create_engine, text, Column, Integer, String,
    Float, Boolean, DateTime, JSON, Text
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import QueuePool

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASSWORD", "password")
MYSQL_DB   = os.getenv("MYSQL_DB",   "antimule")

DB_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASS}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
)

_engine       = None
_SessionLocal = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        # Test MySQL connection first
        test_engine = create_engine(DB_URL, connect_args={"connect_timeout": 2})
        with test_engine.connect() as conn:
            pass
        _engine = create_engine(
            DB_URL,
            poolclass=QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False,
        )
        _SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)
    return _engine


def get_session() -> Session:
    return _SessionLocal()


def ping() -> bool:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


# ── ORM models ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Prediction(Base):
    __tablename__ = "predictions"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    user_id               = Column(Integer, nullable=True)
    # Key account features stored for audit trail
    f115                  = Column(Float)
    f321                  = Column(Float)
    f670                  = Column(Float)
    f3836                 = Column(Float)
    f3894                 = Column(Float)
    f3891                 = Column(String(50))
    # Model outputs
    ml_probability        = Column(Float, nullable=False)
    anomaly_score         = Column(Float)
    composite_probability = Column(Float, nullable=False)
    risk_score            = Column(Integer, nullable=False, index=True)
    risk_tier             = Column(String(10), nullable=False, index=True)
    prediction            = Column(Integer, nullable=False, index=True)
    prediction_label      = Column(String(30))
    confidence            = Column(Float)
    alerts                = Column(JSON)
    full_account_data     = Column(JSON)   # full input stored as JSON
    source                = Column(String(20), default="api")
    created_at            = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class BatchScan(Base):
    __tablename__ = "batch_scans"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(Integer, nullable=True)
    scan_id         = Column(String(36), unique=True, nullable=False)
    total           = Column(Integer)
    mule_count      = Column(Integer)
    legit_count     = Column(Integer)
    mule_pct        = Column(Float)
    avg_risk_score  = Column(Float)
    tier_breakdown  = Column(JSON)
    source          = Column(String(20), default="api")
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Alert(Base):
    __tablename__ = "alerts"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, nullable=True)
    prediction_id  = Column(Integer, index=True)
    risk_score     = Column(Integer)
    risk_tier      = Column(String(10))
    ml_probability = Column(Float)
    alert_reason   = Column(Text)
    acknowledged   = Column(Boolean, default=False, index=True)
    created_at     = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class ModelRun(Base):
    __tablename__ = "model_runs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    metrics    = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def create_tables():
    """Create all tables if they don't exist. Safe to call multiple times."""
    Base.metadata.create_all(get_engine())
    print("[MySQL] Tables created/verified.")


# ── CRUD ──────────────────────────────────────────────────────────────────────
def save_prediction(account_data: dict, result: dict,
                    source: str = "api", user_id: Optional[int] = None) -> int:
    db = get_session()
    try:
        row = Prediction(
            user_id               = user_id,
            f115                  = account_data.get("F115"),
            f321                  = account_data.get("F321"),
            f670                  = account_data.get("F670"),
            f3836                 = account_data.get("F3836"),
            f3894                 = account_data.get("F3894"),
            f3891                 = str(account_data.get("F3891", "")),
            ml_probability        = result.get("ml_probability", 0),
            anomaly_score         = result.get("anomaly_score"),
            composite_probability = result.get("composite_probability", 0),
            risk_score            = result.get("risk_score", 0),
            risk_tier             = result.get("risk_tier", ""),
            prediction            = result.get("prediction", 0),
            prediction_label      = result.get("prediction_label", ""),
            confidence            = result.get("confidence"),
            alerts                = result.get("alerts", []),
            full_account_data     = account_data,
            source                = source,
        )
        db.add(row)
        db.flush()

        # Auto-alert
        if result.get("risk_tier") in ("CRITICAL", "HIGH"):
            db.add(Alert(
                user_id        = user_id,
                prediction_id  = row.id,
                risk_score     = result.get("risk_score"),
                risk_tier      = result.get("risk_tier"),
                ml_probability = result.get("ml_probability"),
                alert_reason   = (result.get("alerts") or ["High risk detected"])[0],
            ))

        db.commit()
        return row.id
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def save_batch(scan_id: str, accounts: list,
               results: list, source: str = "api", user_id: Optional[int] = None) -> int:
    db = get_session()
    try:
        mule_count = sum(1 for r in results if r.get("prediction") == 1)
        tiers      = {}
        for r in results:
            t = r.get("risk_tier", "UNKNOWN")
            tiers[t] = tiers.get(t, 0) + 1

        scan = BatchScan(
            user_id        = user_id,
            scan_id        = scan_id,
            total          = len(results),
            mule_count     = mule_count,
            legit_count    = len(results) - mule_count,
            mule_pct       = round(100 * mule_count / max(len(results), 1), 2),
            avg_risk_score = round(sum(r.get("risk_score", 0) for r in results) / max(len(results), 1), 2),
            tier_breakdown = tiers,
            source         = source,
        )
        db.add(scan)
        db.flush()

        rows = [
            Prediction(
                user_id               = user_id,
                f115                  = a.get("F115"),
                f670                  = a.get("F670"),
                f3894                 = a.get("F3894"),
                ml_probability        = r.get("ml_probability", 0),
                anomaly_score         = r.get("anomaly_score"),
                composite_probability = r.get("composite_probability", 0),
                risk_score            = r.get("risk_score", 0),
                risk_tier             = r.get("risk_tier", ""),
                prediction            = r.get("prediction", 0),
                prediction_label      = r.get("prediction_label", ""),
                confidence            = r.get("confidence"),
                alerts                = r.get("alerts", []),
                full_account_data     = a,
                source                = "batch",
            )
            for a, r in zip(accounts, results)
        ]
        db.bulk_save_objects(rows)
        db.commit()
        return scan.id
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def get_recent_predictions(limit: int = 50, user_id: Optional[int] = None) -> List[dict]:
    db = get_session()
    try:
        query = db.query(Prediction)
        if user_id is not None:
            query = query.filter(Prediction.user_id == user_id)
        rows = (
            query
            .order_by(Prediction.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id":                    r.id,
                "ml_probability":        r.ml_probability,
                "composite_probability": r.composite_probability,
                "risk_score":            r.risk_score,
                "risk_tier":             r.risk_tier,
                "prediction":            r.prediction,
                "prediction_label":      r.prediction_label,
                "source":                r.source,
                "created_at":            r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    finally:
        db.close()


def get_stats(user_id: Optional[int] = None) -> dict:
    db = get_session()
    try:
        pred_query = db.query(Prediction)
        alert_query = db.query(Alert).filter(Alert.acknowledged == False)
        if user_id is not None:
            pred_query = pred_query.filter(Prediction.user_id == user_id)
            alert_query = alert_query.filter(Alert.user_id == user_id)
            
        total  = pred_query.count()
        mules  = pred_query.filter(Prediction.prediction == 1).count()
        alerts = alert_query.count()
        
        if user_id is not None:
            tier_rows = db.execute(
                text("SELECT risk_tier, COUNT(*) cnt FROM predictions WHERE user_id = :uid GROUP BY risk_tier"),
                {"uid": user_id}
            ).fetchall()
        else:
            tier_rows = db.execute(
                text("SELECT risk_tier, COUNT(*) cnt FROM predictions GROUP BY risk_tier")
            ).fetchall()
            
        return {
            "total_scored":   total,
            "mule_count":     mules,
            "legit_count":    total - mules,
            "open_alerts":    alerts,
            "tier_breakdown": {row[0]: row[1] for row in tier_rows},
        }
    finally:
        db.close()


def get_alerts(limit: int = 20) -> List[dict]:
    db = get_session()
    try:
        rows = (
            db.query(Alert)
            .filter(Alert.acknowledged == False)
            .order_by(Alert.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id":             r.id,
                "prediction_id":  r.prediction_id,
                "risk_score":     r.risk_score,
                "risk_tier":      r.risk_tier,
                "ml_probability": r.ml_probability,
                "alert_reason":   r.alert_reason,
                "created_at":     r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    finally:
        db.close()


def save_model_metrics(metrics: list) -> int:
    db = get_session()
    try:
        row = ModelRun(metrics=metrics)
        db.add(row)
        db.commit()
        return row.id
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def create_user(email: str, password_hash: str, name: Optional[str] = None) -> dict:
    db = get_session()
    try:
        user = User(email=email, password_hash=password_hash, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
        return {'id': user.id, 'email': user.email, 'name': user.name, 'created_at': user.created_at.isoformat() if user.created_at else None}
    except Exception as e:
        db.rollback()
        raise ValueError(f'User with email {email} already exists or db error: {e}')
    finally:
        db.close()

def get_user_by_email(email: str) -> Optional[dict]:
    db = get_session()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            return {'id': user.id, 'email': user.email, 'name': user.name, 'password_hash': user.password_hash, 'created_at': user.created_at.isoformat() if user.created_at else None}
        return None
    finally:
        db.close()

