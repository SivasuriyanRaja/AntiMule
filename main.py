"""
main.py  –  AntiMule FastAPI server
Endpoints:
  GET  /health          – liveness check
  POST /train           – stream training logs via Server-Sent Events (SSE)
  POST /predict         – single account prediction
  POST /predict/batch   – batch prediction
"""

# ── Path setup MUST be first — before any ML imports ─────────────────────────
import os, sys

_ROOT   = os.path.dirname(os.path.abspath(__file__))
_ML_DIR = os.path.join(_ROOT, "neon-guard-ui-main", "src", "lib", "ml")
if _ML_DIR not in sys.path:
    sys.path.insert(0, _ML_DIR)

# ── Standard library ──────────────────────────────────────────────────────────
import io, json, queue, tempfile, threading, traceback, uuid

# ── DB layer (non-blocking — if DB is down, API still works) ─────────────────
_DB_ROOT = os.path.dirname(os.path.abspath(__file__))
if _DB_ROOT not in sys.path:
    sys.path.insert(0, _DB_ROOT)
try:
    from db import db as _db
    _DB_AVAILABLE = True
except Exception as _db_err:
    _DB_AVAILABLE = False
    print(f"[DB] Not available (API still works): {_db_err}")

# ── FastAPI ───────────────────────────────────────────────────────────────────
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
JWT_SECRET = 'your-super-secret-key-please-change-in-prod'
JWT_ALGORITHM = 'HS256'

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# ── ML modules (now findable because _ML_DIR is in sys.path) ─────────────────
try:
    from train_optimized import train_pipeline_optimized       # type: ignore
    from inference_optimized import get_detector               # type: ignore
    _ML_AVAILABLE = True
except ImportError as _e:
    _ML_AVAILABLE = False
    _ML_IMPORT_ERROR = str(_e)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="AntiMule API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── /health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.0",
        "ml_available": _ML_AVAILABLE,
        "ml_dir": _ML_DIR,
    }


# ── /train  (SSE streaming) ────────────────────────────────────────────────────
@app.post("/train")
async def train(file: UploadFile = File(...)):
    """
    Accept a CSV upload and run the full training pipeline.
    Streams progress as Server-Sent Events so the browser shows live logs.
    """
    if not _ML_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=f"ML modules not available: {_ML_IMPORT_ERROR}. "
                   f"Run: pip install -r neon-guard-ui-main/src/lib/ml/requirements.txt",
        )

    contents = await file.read()

    def generate():
        log_q:     queue.Queue = queue.Queue()
        done_flag: threading.Event = threading.Event()

        class _Writer(io.TextIOBase):
            def write(self, s: str) -> int:
                if s.strip():
                    log_q.put(s.rstrip())
                return len(s)
            def flush(self) -> None:
                pass

        def _run() -> None:
            old_out = sys.stdout
            sys.stdout = _Writer()
            try:
                with tempfile.NamedTemporaryFile(
                    suffix=".csv", delete=False, mode="wb"
                ) as tmp:
                    tmp.write(contents)
                    tmp_path = tmp.name

                best_clf, all_metrics, _X, _y, _t = train_pipeline_optimized(tmp_path)
                os.unlink(tmp_path)

                best = max(all_metrics, key=lambda m: m["avg_precision"])
                log_q.put(
                    f"[RESULT] best_model={best['model']} "
                    f"auc={best['roc_auc']} "
                    f"avg_precision={best['avg_precision']} "
                    f"recall={best['recall']} "
                    f"precision={best['precision']}"
                )
                # ── Persist metrics to DB (non-blocking) ──────────────
                if _DB_AVAILABLE:
                    try:
                        import asyncio as _asyncio
                        _asyncio.get_event_loop().run_until_complete(
                            _db.async_save_model_metrics(all_metrics)
                        )
                        log_q.put("[DB] Training metrics saved to database.")
                    except Exception as _dbe:
                        log_q.put(f"[DB] Metrics save skipped: {_dbe}")
                
                # Clear singleton cache to reload the newly trained model on next predict
                if hasattr(get_detector, '_instance'):
                    delattr(get_detector, '_instance')
                    log_q.put("[INFO] Model cache cleared. Next prediction will load the new model.")
            except Exception as e:
                if isinstance(e, ValueError):
                    log_q.put(f"[ERROR] {str(e)}")
                else:
                    log_q.put(f"[ERROR] {traceback.format_exc()}")
            finally:
                sys.stdout = old_out
                done_flag.set()

        threading.Thread(target=_run, daemon=True).start()

        while not done_flag.is_set() or not log_q.empty():
            try:
                line = log_q.get(timeout=0.3)
                yield f"data: {json.dumps({'log': line})}\n\n"
            except queue.Empty:
                pass

        yield f"data: {json.dumps({'log': '[DONE] Training complete', 'done': True})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── /predict  (single account) ────────────────────────────────────────────────
class AccountData(BaseModel):
    model_config = {"extra": "allow"}


@app.post("/predict")
async def predict_single(account: AccountData, current_user: dict = Depends(get_current_user)):
    if not _ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML modules not available")
    try:
        detector = get_detector()
        result   = detector.predict_single(account.model_dump())
        # ── Persist to DB (non-blocking) ───────────────────────────────
        if _DB_AVAILABLE:
            try:
                await _db.async_save_prediction(account.model_dump(), result, source="api", user_id=current_user.get("sub"))
            except Exception:
                pass
        return {"status": "success", "prediction": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── /predict/batch ────────────────────────────────────────────────────────────
@app.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not _ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML modules not available")
    try:
        import pandas as pd
        contents = await file.read()
        df       = pd.read_csv(io.BytesIO(contents))

        detector = get_detector()
        results  = detector.predict_batch(df)

        # pyrefly: ignore [unnecessary-type-conversion]
        mule_count = int((results["prediction"] == 1).sum())
        scan_id    = str(uuid.uuid4())

        # ── Persist batch to DB (non-blocking) ─────────────────────────
        if _DB_AVAILABLE:
            try:
                accounts_list = df.to_dict(orient="records")
                results_list  = results.to_dict(orient="records")
                await _db.async_save_batch(scan_id, accounts_list, results_list, source="api") # user_id will be added to batch_scans
            except Exception:
                pass

        return {
            "status":  "success",
            "scan_id": scan_id,
            "summary": {
                "total":      len(results),
                "mule_count": mule_count,
                "mule_pct":   round(100 * mule_count / max(len(results), 1), 2),
                # pyrefly: ignore [unnecessary-type-conversion]
                "avg_risk":   round(float(results["risk_score"].mean()), 2),
            },
            "predictions": results.head(200).to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



# ── /db/* endpoints ────────────────────────────────────────────────────────────
@app.get("/db/status")
async def db_status():
    """MongoDB + MySQL connectivity check."""
    if not _DB_AVAILABLE:
        return {"available": False, "reason": "DB module not loaded"}
    return _db.status()


@app.get("/db/stats")
async def db_stats(current_user: dict = Depends(get_current_user)):
    """Live prediction statistics from DB."""
    if not _DB_AVAILABLE:
        raise HTTPException(status_code=503, detail="DB not available")
    try:
        stats = await _db.async_get_stats(user_id=current_user.get("sub"))
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/db/recent")
async def db_recent(limit: int = Query(default=50, le=500), current_user: dict = Depends(get_current_user)):
    """Most recent predictions from DB."""
    if not _DB_AVAILABLE:
        raise HTTPException(status_code=503, detail="DB not available")
    try:
        rows = await _db.async_get_recent(limit, user_id=current_user.get("sub"))
        for r in rows:
            if "created_at" in r and hasattr(r.get("created_at"), "isoformat"):
                r["created_at"] = r["created_at"].isoformat()
        return {"count": len(rows), "results": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/db/alerts")
async def db_alerts(limit: int = Query(default=20, le=100), current_user: dict = Depends(get_current_user)):
    """Unacknowledged high-risk alerts."""
    if not _DB_AVAILABLE:
        raise HTTPException(status_code=503, detail="DB not available")
    try:
        user_id = current_user.get("sub")
        alerts = await _db.async_get_alerts(limit, user_id=user_id)
        for a in alerts:
            if "created_at" in a and hasattr(a.get("created_at"), "isoformat"):
                a["created_at"] = a["created_at"].isoformat()
        return {"count": len(alerts), "alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── /model/* endpoints ────────────────────────────────────────────────────────
@app.get("/model/metrics")
async def model_metrics():
    """Returns training evaluation metrics from the latest run."""
    reports_dir = "/tmp/reports" if (os.environ.get("VERCEL") and os.path.exists("/tmp/reports/evaluation_metrics.json")) else os.path.join(_ROOT, "neon-guard-ui-main", "src", "lib", "reports")
    metrics_file = os.path.join(reports_dir, "evaluation_metrics.json")
    if not os.path.exists(metrics_file):
        return {"available": False, "reason": "No model trained yet"}
    try:
        with open(metrics_file, "r") as f:
            data = json.load(f)
        return {"available": True, "metrics": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/feature-importance")
async def model_feature_importance():
    """Returns top feature importances from the latest run."""
    reports_dir = "/tmp/reports" if (os.environ.get("VERCEL") and os.path.exists("/tmp/reports/feature_importances.csv")) else os.path.join(_ROOT, "neon-guard-ui-main", "src", "lib", "reports")
    importances_file = os.path.join(reports_dir, "feature_importances.csv")
    if not os.path.exists(importances_file):
        return {"available": False, "reason": "No model trained yet"}
    try:
        import pandas as pd
        df = pd.read_csv(importances_file, header=None, names=["feature", "importance"])
        if isinstance(df, pd.Series):
            df = df.to_frame()
        df = df.dropna(subset=["feature"])
        df = df[df["feature"] != "0"] # just in case
        # Return top 20
        top_features = df.head(20).to_dict(orient="records") # type: ignore
        return {"available": True, "features": top_features}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/features")
async def model_features():
    """Returns the expected feature columns for the trained model."""
    artifacts_dir = "/tmp/models" if (os.environ.get("VERCEL") and os.path.exists("/tmp/models/feature_cols.pkl")) else os.path.join(_ROOT, "neon-guard-ui-main", "src", "lib", "models")
    features_file = os.path.join(artifacts_dir, "feature_cols.pkl")
    if not os.path.exists(features_file):
        return {"available": False, "reason": "No model trained yet"}
    try:
        import joblib
        features = joblib.load(features_file)
        return {"available": True, "features": features}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=False)

# -- Auth Endpoints ------------------------------------------------------------
import jwt
from passlib.hash import pbkdf2_sha256

from datetime import datetime, timedelta, timezone




JWT_EXPIRATION_HOURS = 24



class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

@app.post('/auth/register')
async def register(user: UserCreate):
    if not _DB_AVAILABLE:
        raise HTTPException(status_code=500, detail='Database unavailable')
    pass_hash = pbkdf2_sha256.hash(user.password)
    try:
        new_user = await _db.async_create_user(user.email, pass_hash, user.name)
        return {'status': 'success', 'user': {'id': new_user['id'], 'email': new_user['email'], 'name': new_user.get('name')}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/auth/login')
async def login(user: UserLogin):
    if not _DB_AVAILABLE:
        raise HTTPException(status_code=500, detail='Database unavailable')
    db_user = await _db.async_get_user_by_email(user.email)
    if not db_user or not pbkdf2_sha256.verify(user.password, db_user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    
    payload = {
        'sub': str(db_user['id']),
        'email': db_user['email'],
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {'status': 'success', 'token': token, 'user': {'id': db_user['id'], 'email': db_user['email'], 'name': db_user.get('name')}}

