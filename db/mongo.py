"""
db/mongo.py  —  AntiMule MongoDB layer
Collections:
  predictions   — every scored account (single + batch)
  batch_scans   — batch scan metadata + summary
  alerts        — auto-generated high-risk alerts
  model_metrics — training metrics history

Motor  -> async (FastAPI endpoints)
PyMongo -> sync  (scripts, health checks)
"""

import os
from datetime import datetime, timezone
from typing import Optional, Any
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB",  "antimule")

# ── Async client (FastAPI / motor) ────────────────────────────────────────────
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    _async_client: Optional[AsyncIOMotorClient] = None

    def get_async_db():
        global _async_client
        if _async_client is None:
            _async_client = AsyncIOMotorClient(MONGO_URI)
        return _async_client[MONGO_DB]
except ImportError:
    def get_async_db():
        raise ImportError("motor is required for async MongoDB operations")

# ── Sync client (scripts / health checks) ────────────────────────────────────
try:
    from pymongo import MongoClient, DESCENDING
    _sync_client: Optional[MongoClient] = None

    def get_sync_db():
        global _sync_client
        if _sync_client is None:
            _sync_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        return _sync_client[MONGO_DB]

    def ping() -> bool:
        try:
            get_sync_db().command("ping")
            return True
        except Exception:
            return False

except ImportError:
    def get_sync_db():
        raise ImportError("pymongo is required for sync MongoDB operations")
    ping = lambda: False


# ── Document builders ─────────────────────────────────────────────────────────
def _pred_doc(account_data: dict, result: dict, source: str = "api") -> dict:
    return {
        "account_data":         account_data,
        "ml_probability":       result.get("ml_probability"),
        "anomaly_score":        result.get("anomaly_score"),
        "composite_probability":result.get("composite_probability"),
        "risk_score":           result.get("risk_score"),
        "risk_tier":            result.get("risk_tier"),
        "prediction":           result.get("prediction"),
        "prediction_label":     result.get("prediction_label"),
        "confidence":           result.get("confidence"),
        "alerts":               result.get("alerts", []),
        "source":               source,
        "created_at":           datetime.now(timezone.utc),
    }


def _batch_doc(scan_id: str, results: list, source: str = "api") -> dict:
    mule_count = sum(1 for r in results if r.get("prediction") == 1)
    tiers = {}
    for r in results:
        t = r.get("risk_tier", "UNKNOWN")
        tiers[t] = tiers.get(t, 0) + 1
    avg_risk = round(sum(r.get("risk_score", 0) for r in results) / max(len(results), 1), 2)
    return {
        "scan_id":        scan_id,
        "total":          len(results),
        "mule_count":     mule_count,
        "legit_count":    len(results) - mule_count,
        "mule_pct":       round(100 * mule_count / max(len(results), 1), 2),
        "avg_risk_score": avg_risk,
        "tier_breakdown": tiers,
        "source":         source,
        "created_at":     datetime.now(timezone.utc),
    }


# ═══════════════════════════════════════════════════════════════════
# ASYNC  (FastAPI)
# ═══════════════════════════════════════════════════════════════════

async def async_save_prediction(account_data: dict, result: dict,
                                source: str = "api") -> str:
    db  = get_async_db()
    doc = _pred_doc(account_data, result, source)
    res = await db.predictions.insert_one(doc)
    # Auto-alert for CRITICAL / HIGH risk
    if result.get("risk_tier") in ("CRITICAL", "HIGH"):
        await db.alerts.insert_one({
            "prediction_id":  str(res.inserted_id),
            "risk_score":     result.get("risk_score"),
            "risk_tier":      result.get("risk_tier"),
            "ml_probability": result.get("ml_probability"),
            "alert_reason":   (result.get("alerts") or ["High risk detected"])[0],
            "acknowledged":   False,
            "created_at":     datetime.now(timezone.utc),
        })
    return str(res.inserted_id)


async def async_save_batch(scan_id: str, accounts: list,
                           results: list, source: str = "api") -> str:
    db  = get_async_db()
    doc = _batch_doc(scan_id, results, source)
    res = await db.batch_scans.insert_one(doc)
    # Bulk insert individual predictions
    docs = [_pred_doc(a, r, "batch") for a, r in zip(accounts, results)]
    if docs:
        await db.predictions.insert_many(docs)
    return str(res.inserted_id)


async def async_get_recent(limit: int = 50, user_id: Optional[str] = None) -> list:
    db     = get_async_db()
    cursor = db.predictions.find(
        {}, {"_id": 0, "account_data": 0}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def async_get_stats(user_id: Optional[str] = None) -> dict:
    db       = get_async_db()
    total    = await db.predictions.count_documents({})
    mules    = await db.predictions.count_documents({"prediction": 1})
    alerts   = await db.alerts.count_documents({"acknowledged": False})
    tier_agg = await db.predictions.aggregate(
        [{"$group": {"_id": "$risk_tier", "count": {"$sum": 1}}}]
    ).to_list(length=10)
    return {
        "total_scored":  total,
        "mule_count":    mules,
        "legit_count":   total - mules,
        "open_alerts":   alerts,
        "tier_breakdown": {d["_id"]: d["count"] for d in tier_agg if d["_id"]},
    }


async def async_get_alerts(limit: int = 20, user_id: Optional[str] = None) -> list:
    db     = get_async_db()
    query: dict[str, Any] = {"acknowledged": False}
    if user_id: query["user_id"] = str(user_id)
    cursor = db.alerts.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def async_save_model_metrics(metrics: list) -> str:
    db  = get_async_db()
    doc = {"metrics": metrics, "created_at": datetime.now(timezone.utc)}
    res = await db.model_metrics.insert_one(doc)
    return str(res.inserted_id)


# ═══════════════════════════════════════════════════════════════════
# SYNC  (scripts / startup checks)
# ═══════════════════════════════════════════════════════════════════

def sync_save_prediction(account_data: dict, result: dict,
                         source: str = "api") -> str:
    db  = get_sync_db()
    doc = _pred_doc(account_data, result, source)
    res = db.predictions.insert_one(doc)
    if result.get("risk_tier") in ("CRITICAL", "HIGH"):
        db.alerts.insert_one({
            "prediction_id":  str(res.inserted_id),
            "risk_score":     result.get("risk_score"),
            "risk_tier":      result.get("risk_tier"),
            "alert_reason":   (result.get("alerts") or ["High risk detected"])[0],
            "acknowledged":   False,
            "created_at":     datetime.now(timezone.utc),
        })
    return str(res.inserted_id)


def sync_get_recent(limit: int = 50, user_id: Optional[str] = None) -> list:
    db = get_sync_db()
    return list(
        db.predictions.find(
            {}, {"_id": 0, "account_data": 0}
        ).sort("created_at", DESCENDING).limit(limit)
    )


def sync_get_stats() -> dict:
    db     = get_sync_db()
    total  = db.predictions.count_documents({})
    mules  = db.predictions.count_documents({"prediction": 1})
    alerts = db.alerts.count_documents({"acknowledged": False})
    tiers  = db.predictions.aggregate(
        [{"$group": {"_id": "$risk_tier", "count": {"$sum": 1}}}]
    )
    return {
        "total_scored":   total,
        "mule_count":     mules,
        "legit_count":    total - mules,
        "open_alerts":    alerts,
        "tier_breakdown": {d["_id"]: d["count"] for d in tiers if d["_id"]},
    }


def ensure_indexes():
    """Create indexes once at startup."""
    db = get_sync_db()
    db.predictions.create_index([("created_at", DESCENDING)])
    db.predictions.create_index([("prediction", 1)])
    db.predictions.create_index([("risk_tier", 1)])
    db.predictions.create_index([("risk_score", DESCENDING)])
    db.alerts.create_index([("acknowledged", 1)])
    db.alerts.create_index([("created_at", DESCENDING)])
    db.batch_scans.create_index([("scan_id", 1)], unique=True)
    db.batch_scans.create_index([("created_at", DESCENDING)])
    print("[MongoDB] Indexes created.")

async def async_create_user(email: str, password_hash: str, name: Optional[str] = None) -> dict:
    db = get_async_db()
    doc = {'email': email, 'password_hash': password_hash, 'name': name, 'created_at': datetime.now(timezone.utc).isoformat()}
    try:
        res = await db.users.insert_one(doc)
        doc['id'] = str(res.inserted_id)
        return doc
    except Exception as e:
        raise ValueError(f'User with email {email} already exists or db error: {e}')

async def async_get_user_by_email(email: str) -> Optional[dict]:
    db = get_async_db()
    doc = await db.users.find_one({'email': email})
    if doc:
        doc['id'] = str(doc.pop('_id'))
    return doc

def create_user(email: str, password_hash: str, name: Optional[str] = None) -> dict:
    db = get_sync_db()
    doc = {'email': email, 'password_hash': password_hash, 'name': name, 'created_at': datetime.now(timezone.utc).isoformat()}
    try:
        res = db.users.insert_one(doc)
        doc['id'] = str(res.inserted_id)
        return doc
    except Exception as e:
        raise ValueError(f'User with email {email} already exists or db error: {e}')

def get_user_by_email(email: str) -> Optional[dict]:
    db = get_sync_db()
    doc = db.users.find_one({'email': email})
    if doc:
        doc['id'] = str(doc.pop('_id'))
    return doc

