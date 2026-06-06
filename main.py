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
import io, json, queue, tempfile, threading, traceback

# ── FastAPI ───────────────────────────────────────────────────────────────────
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

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
            except Exception:
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
def predict_single(account: AccountData):
    if not _ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML modules not available")
    try:
        detector = get_detector()
        result   = detector.predict_single(account.model_dump())
        return {"status": "success", "prediction": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── /predict/batch ────────────────────────────────────────────────────────────
@app.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    if not _ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="ML modules not available")
    try:
        import pandas as pd
        contents = await file.read()
        df       = pd.read_csv(io.BytesIO(contents))

        detector = get_detector()
        results  = detector.predict_batch(df)

        mule_count = int((results["prediction"] == 1).sum())
        return {
            "status": "success",
            "summary": {
                "total":      len(results),
                "mule_count": mule_count,
                "mule_pct":   round(100 * mule_count / max(len(results), 1), 2),
                "avg_risk":   round(float(results["risk_score"].mean()), 2),
            },
            "predictions": results.head(200).to_dict(orient="records"),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
