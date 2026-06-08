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
        if self.backend in ("mongodb", "both"):
            try:
                from db import mongo as _m
                self._mongo = _m
                print(f"[DB] MongoDB ready  -> {_m.MONGO_URI}/{_m.MONGO_DB}")
            except Exception as e:
                print(f"[DB] MongoDB init failed: {e}")

        if self.backend in ("mysql", "both"):
            try:
                from db import mysql as _s
                _s.create_tables()
                self._mysql = _s
                print(f"[DB] MySQL ready    -> {_s.MYSQL_HOST}/{_s.MYSQL_DB}")
            except Exception as e:
                print(f"[DB] MySQL init failed: {e}")

    # ── Status ─────────────────────────────────────────────────────────────
    def status(self) -> dict:
        out = {"backend": self.backend}
        if self._mongo:
            out["mongodb"] = self._mongo.ping()
        if self._mysql:
            out["mysql"]   = self._mysql.ping()
        return out

    # ── Save prediction (async) ─────────────────────────────────────────────
    async def async_save_prediction(self, account_data: dict, result: dict,
                                    source: str = "api") -> dict:
        ids = {}
        if self._mongo:
            try:
                ids["mongo_id"] = await self._mongo.async_save_prediction(
                    account_data, result, source
                )
            except Exception as e:
                ids["mongo_error"] = str(e)
        if self._mysql:
            try:
                loop = asyncio.get_event_loop()
                ids["mysql_id"] = await loop.run_in_executor(
                    None, lambda: self._mysql.save_prediction(account_data, result, source)
                )
            except Exception as e:
                ids["mysql_error"] = str(e)
        return ids

    # ── Save prediction (sync) ──────────────────────────────────────────────
    def save_prediction(self, account_data: dict, result: dict,
                        source: str = "api") -> dict:
        ids = {}
        if self._mongo:
            try:
                ids["mongo_id"] = self._mongo.sync_save_prediction(
                    account_data, result, source
                )
            except Exception as e:
                ids["mongo_error"] = str(e)
        if self._mysql:
            try:
                ids["mysql_id"] = self._mysql.save_prediction(account_data, result, source)
            except Exception as e:
                ids["mysql_error"] = str(e)
        return ids

    # ── Save batch (async) ──────────────────────────────────────────────────
    async def async_save_batch(self, scan_id: str, accounts: list,
                               results: list, source: str = "api") -> dict:
        ids = {}
        if self._mongo:
            try:
                ids["mongo_id"] = await self._mongo.async_save_batch(
                    scan_id, accounts, results, source
                )
            except Exception as e:
                ids["mongo_error"] = str(e)
        if self._mysql:
            try:
                loop = asyncio.get_event_loop()
                ids["mysql_id"] = await loop.run_in_executor(
                    None, lambda: self._mysql.save_batch(scan_id, accounts, results, source)
                )
            except Exception as e:
                ids["mysql_error"] = str(e)
        return ids

    # ── Stats (async) ───────────────────────────────────────────────────────
    async def async_get_stats(self) -> dict:
        if self._mongo:
            try:
                return await self._mongo.async_get_stats()
            except Exception:
                pass
        if self._mysql:
            try:
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, self._mysql.get_stats)
            except Exception:
                pass
        return {}

    # ── Stats (sync) ────────────────────────────────────────────────────────
    def get_stats(self) -> dict:
        if self._mongo:
            try:
                return self._mongo.sync_get_stats()
            except Exception:
                pass
        if self._mysql:
            try:
                return self._mysql.get_stats()
            except Exception:
                pass
        return {}

    # ── Recent predictions (async) ──────────────────────────────────────────
    async def async_get_recent(self, limit: int = 50) -> list:
        if self._mongo:
            try:
                return await self._mongo.async_get_recent(limit)
            except Exception:
                pass
        if self._mysql:
            try:
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(
                    None, lambda: self._mysql.get_recent_predictions(limit)
                )
            except Exception:
                pass
        return []

    # ── Alerts (async) ──────────────────────────────────────────────────────
    async def async_get_alerts(self, limit: int = 20) -> list:
        if self._mongo:
            try:
                return await self._mongo.async_get_alerts(limit)
            except Exception:
                pass
        if self._mysql:
            try:
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(
                    None, lambda: self._mysql.get_alerts(limit)
                )
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
        if self._mysql:
            try:
                loop = asyncio.get_event_loop()
                ids["mysql_id"] = await loop.run_in_executor(
                    None, lambda: self._mysql.save_model_metrics(metrics)
                )
            except Exception as e:
                ids["mysql_error"] = str(e)
        return ids


# Singleton — import this everywhere
db = _Router(BACKEND)
