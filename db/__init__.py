"""
db/__init__.py  —  AntiMule unified database router

Usage anywhere in the project:
    from db import db

    # async (inside FastAPI async def)
    await db.async_save_prediction(account_data, result)
    await db.async_save_batch(scan_id, accounts, results)
    stats = await db.async_get_stats()

    # sync (scripts, health checks)
    db.save_prediction(account_data, result)
    stats = db.get_stats()

Set DB_BACKEND in .env:
    "mongodb" -> MongoDB only
    "mysql"   -> MySQL only
    "both"    -> writes to both, reads from MongoDB
"""

import os, asyncio
from dotenv import load_dotenv
load_dotenv()

BACKEND = os.getenv("DB_BACKEND", "mongodb").lower()


class _Router:
    def __init__(self, backend: str):
        self.backend = backend
        self._mongo  = None
        self._mysql  = None
        self._init()

    def _init(self):
        try:
            from db import mongo as _m
            self._mongo = _m
            print(f"[DB] MongoDB ready  -> {_m.MONGO_URI}/{_m.MONGO_DB}")
        except Exception as e:
            print(f"[DB] MongoDB init failed: {e}")

        try:
            from db import mysql as _s
            _s.create_tables()
            self._mysql = _s
            print(f"[DB] MySQL ready    -> {_s.MYSQL_HOST}/{_s.MYSQL_DB}")
        except Exception as e:
            print(f"[DB] MySQL init failed: {e}")

    # ── Status ─────────────────────────────────────────────────────────────
    def status(self) -> dict:
        out = {"backend": "mixed (Users -> MySQL, ML -> Mongo)"}
        if self._mongo:
            out["mongodb"] = self._mongo.ping()
        if self._mysql:
            out["mysql"]   = self._mysql.ping()
        return out

    # ── Save prediction (async) ─────────────────────────────────────────────
    async def async_save_prediction(self, account_data: dict, result: dict,
                                    source: str = "api", user_id = None) -> dict:
        ids = {}
        if self._mongo:
            try:
                ids["mongo_id"] = await self._mongo.async_save_prediction(
                    account_data, result, source, user_id
                )
            except Exception as e:
                ids["mongo_error"] = str(e)
        return ids

    # ── Save prediction (sync) ──────────────────────────────────────────────
    def save_prediction(self, account_data: dict, result: dict,
                        source: str = "api", user_id = None) -> dict:
        ids = {}
        if self._mongo:
            try:
                ids["mongo_id"] = self._mongo.sync_save_prediction(
                    account_data, result, source, user_id
                )
            except Exception as e:
                ids["mongo_error"] = str(e)
        return ids

    # ── Save batch (async) ──────────────────────────────────────────────────
    async def async_save_batch(self, scan_id: str, accounts: list,
                               results: list, source: str = "api", user_id = None) -> dict:
        ids = {}
        if self._mongo:
            try:
                ids["mongo_id"] = await self._mongo.async_save_batch(
                    scan_id, accounts, results, source, user_id
                )
            except Exception as e:
                ids["mongo_error"] = str(e)
        return ids

    # ── Stats (async) ───────────────────────────────────────────────────────
    async def async_get_stats(self, user_id = None) -> dict:
        if self._mongo:
            try:
                return await self._mongo.async_get_stats(user_id)
            except Exception:
                pass
        return {}

    # ── Stats (sync) ────────────────────────────────────────────────────────
    def get_stats(self, user_id = None) -> dict:
        if self._mongo:
            try:
                return self._mongo.sync_get_stats()
            except Exception:
                pass
        return {}

    # ── Recent predictions (async) ──────────────────────────────────────────
    async def async_get_recent(self, limit: int = 50, user_id = None) -> list:
        if self._mongo:
            try:
                return await self._mongo.async_get_recent(limit, user_id)
            except Exception:
                pass
        return []

    # ── Alerts (async) ──────────────────────────────────────────────────────
    async def async_get_alerts(self, limit: int = 20, user_id = None) -> list:
        if self._mongo:
            try:
                return await self._mongo.async_get_alerts(limit, user_id)
            except Exception:
                pass
        return []

    # ── Save model metrics (async) ──────────────────────────────────────────
    async def async_save_model_metrics(self, metrics: list) -> dict:
        ids = {}
        if self._mongo:
            try:
                ids["mongo_id"] = await self._mongo.async_save_model_metrics(metrics)
            except Exception as e:
                ids["mongo_error"] = str(e)
        return ids



    # -- Users (async) — MongoDB only, no MySQL required ---------------------
    async def async_create_user(self, email: str, password_hash: str, name: str = None) -> dict:
        if self._mongo:
            try:
                # mongo.py async_create_user doesn't accept name, patch it inline
                from motor.motor_asyncio import AsyncIOMotorClient
                from datetime import datetime, timezone
                db = self._mongo.get_async_db()
                existing = await db.users.find_one({"email": email})
                if existing:
                    raise ValueError(f"User with email {email} already exists.")
                doc = {
                    "email": email,
                    "password_hash": password_hash,
                    "name": name,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                res = await db.users.insert_one(doc)
                doc["id"] = str(res.inserted_id)
                return doc
            except ValueError:
                raise
            except Exception as e:
                raise Exception(f"MongoDB user create failed: {e}")
        raise Exception("No database backend available for user authentication.")

    async def async_get_user_by_email(self, email: str) -> dict:
        if self._mongo:
            try:
                return await self._mongo.async_get_user_by_email(email)
            except Exception:
                pass
        return None


# Singleton — import this everywhere
db = _Router(BACKEND)
