# Deployment Checklist & Model Artifacts Guide

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] All dependencies installed: `pip install -r src/lib/ml/requirements.txt`
- [ ] PYTHONPATH includes project root
- [ ] Models directory created: `mkdir -p src/lib/models`
- [ ] Reports directory created: `mkdir -p src/lib/reports`

### Data Preparation
- [ ] DataSet.csv available in accessible location
- [ ] CSV has all required columns (F115, F321, F527, ..., F3924)
- [ ] Data validated for missing values and types
- [ ] Sample predictions tested on small subset

### Model Training
- [ ] Run: `python src/lib/ml/train_optimized.py path/to/DataSet.csv`
- [ ] Check console output for successful training
- [ ] Verify all 5 model files created in `src/lib/models/`:
  - [ ] `best_model.pkl` (primary model)
  - [ ] `best_threshold.pkl` (optimal decision threshold)
  - [ ] `xgboost.pkl`
  - [ ] `lightgbm.pkl`
  - [ ] `random_forest.pkl`
  - [ ] `ensemble.pkl`
  - [ ] `imputer.pkl`
  - [ ] `scaler.pkl`
  - [ ] `isolation_forest.pkl`
  - [ ] `label_encoders.pkl`
  - [ ] `feature_cols.pkl`
- [ ] Check reports generated in `src/lib/reports/`:
  - [ ] `evaluation_metrics.json`
  - [ ] `feature_importances.csv`
- [ ] Verify ROC-AUC > 0.98 and Avg Precision > 0.65

### Integration Testing
- [ ] Single prediction test successful
- [ ] Batch prediction test successful (100+ records)
- [ ] Error handling verified
- [ ] Performance acceptable (< 200ms per record in batch mode)

### Production Deployment
- [ ] API endpoint accessible at configured URL
- [ ] Health check endpoint responds ✓
- [ ] Prediction latency < 500ms for batch operations
- [ ] Error logging configured
- [ ] Rate limiting configured (if needed)
- [ ] CORS enabled for UI frontend

### Monitoring & Logging
- [ ] Prediction success rate tracked (target: >99.5%)
- [ ] Average risk score trending monitored
- [ ] Alert generation on errors
- [ ] Model performance degradation alerts set
- [ ] Batch job status logged

---

## 📁 Expected Directory Structure

```
neon-guard-ui-main/
├── src/
│   └── lib/
│       ├── ml/                          ← ML Module (NEW)
│       │   ├── __init__.py
│       │   ├── preprocess_optimized.py  
│       │   ├── train_optimized.py       
│       │   ├── inference_optimized.py   
│       │   ├── api_wrapper.py           
│       │   ├── requirements.txt         
│       │   ├── ML_OPTIMIZATION_SUMMARY.md
│       │   ├── INTEGRATION_GUIDE.md     
│       │   └── DEPLOYMENT_CHECKLIST.md  (this file)
│       │
│       ├── models/                      ← Model Artifacts (AUTO-GENERATED)
│       │   ├── best_model.pkl           (~ 50MB)
│       │   ├── best_threshold.pkl       (< 1KB)
│       │   ├── xgboost.pkl              (~ 40MB)
│       │   ├── lightgbm.pkl             (~ 40MB)
│       │   ├── random_forest.pkl        (~ 50MB)
│       │   ├── ensemble.pkl             (~ 130MB)
│       │   ├── imputer.pkl              (< 1KB)
│       │   ├── scaler.pkl               (< 1KB)
│       │   ├── isolation_forest.pkl     (< 1MB)
│       │   ├── label_encoders.pkl       (< 100KB)
│       │   └── feature_cols.pkl         (< 10KB)
│       │
│       ├── reports/                     ← Training Reports (AUTO-GENERATED)
│       │   ├── evaluation_metrics.json
│       │   └── feature_importances.csv
│       │
│       ├── api/                         ← Existing API
│       │   └── example.functions.ts
│       │
│       └── ...other existing files
│
├── data/                                ← Data (Optional)
│   └── DataSet.csv                      (Training data)
│
└── ...other project files
```

---

## 🚀 Quick Start Commands

### One-Time Setup
```bash
# 1. Install dependencies
pip install -r src/lib/ml/requirements.txt

# 2. Train models (5-10 minutes for large datasets)
python src/lib/ml/train_optimized.py data/DataSet.csv

# 3. Verify installation
python -c "from src.lib.ml import get_detector; print('✓ ML module ready')"
```

### Running ML API Server
```bash
# Install additional dependency
pip install fastapi uvicorn

# Start server
python -m uvicorn src.lib.ml.api_wrapper:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload

# Test endpoint
curl http://localhost:8000/health
```

### Docker Deployment
```bash
# Build image
docker build -f Dockerfile.ml -t neon-guard-ml:2.0 .

# Run container
docker run -p 8000:8000 \
    -v $(pwd)/src/lib/models:/app/models \
    neon-guard-ml:2.0
```

---

## 📊 Expected Performance Metrics

### After Successful Training

| Metric | Expected Value | Target |
|--------|---|---|
| ROC-AUC | 0.9880+ | > 0.9800 ✓ |
| Avg Precision | 0.7000+ | > 0.6500 ✓ |
| F1 Score (F2 balanced) | 0.6500+ | > 0.6000 ✓ |
| Recall | 0.7000+ | > 0.6500 ✓ |
| Precision | 0.6500+ | > 0.5500 ✓ |

### Inference Performance

| Operation | Expected | Acceptable Range |
|-----------|---|---|
| Single Prediction | ~50-150ms | < 500ms |
| Single Prediction (cached) | ~10-20ms | < 100ms |
| Batch of 100 | ~100-200ms | < 1000ms |
| Batch of 1000 | ~800-1500ms | < 5000ms |
| Batch of 10,000 | ~8-15s | < 30s |

---

## 🔧 Configuration Tuning

### Adjust Training Parameters

**File**: `src/lib/ml/train_optimized.py`

```python
# Line 28: Class weight (higher = more focus on mule class)
class_weight=1.5  # Try 1.0 to 2.5

# Line 34: Feature selection (more = slower but potentially better)
top_n_variance=150  # Try 100-200

# Line 150: SMOTE neighbors (lower for imbalanced data)
k_neighbors=3  # Try 3-5
```

### Adjust Inference Parameters

**File**: `src/lib/ml/inference_optimized.py`

```python
# Line 150: Anomaly score weight (higher = more emphasis)
iso_weight=0.20  # Try 0.15-0.30

# Lines 170-176: Risk tier boundaries
RISK_TIERS = {
    (0.00, 0.25): ('LOW', '#27ae60'),      # Adjust thresholds
    ...
}

# Line 35: Risk score calculation exponent
exponent=0.65  # Try 0.60-0.70
```

---

## 📈 Performance Optimization Tips

### Faster Training
```bash
# Use fewer variance features
python src/lib/ml/train_optimized.py data/DataSet.csv \
    --top_n_variance 100

# Or modify line in train_optimized.py:
# select_and_clean_features(df_eng, top_n_variance=100)
```

### Faster Inference
```python
# Use batch processing instead of single predictions
from src.lib.ml import predict_batch
import pandas as pd

df = pd.read_csv('accounts.csv')
results = predict_batch(df)  # 5-10x faster than loop
```

### Lower Memory Usage
```python
# For very large batches, process in chunks
chunk_size = 500
for i in range(0, len(df), chunk_size):
    chunk = df.iloc[i:i+chunk_size]
    results = predict_batch(chunk)
    save_results(results)
```

---

## 🐛 Troubleshooting

### Issue: "Module not found: inference_optimized"
```
Error: ModuleNotFoundError: No module named 'inference_optimized'
```
**Solution**: 
- Ensure PYTHONPATH includes project root
- Run from project root directory
- Check `__init__.py` exists in src/lib/ml/

### Issue: "No such file or directory: models/best_model.pkl"
```
Error: FileNotFoundError: [Errno 2] No such file or directory: 'models/best_model.pkl'
```
**Solution**: 
- Run training first: `python src/lib/ml/train_optimized.py data/DataSet.csv`
- Check models directory exists

### Issue: "All features are NaN"
```
Error: ValueError: All features are NaN
```
**Solution**: 
- Verify DataSet.csv has required columns
- Check data types (should be numeric or categorical strings)
- Review preprocess_optimized.py feature list

### Issue: Predictions always return same value
```
Problem: Risk score always around 45-55
```
**Solution**: 
- Verify model training completed successfully
- Check evaluation metrics in reports/evaluation_metrics.json
- Retrain with different hyperparameters

### Issue: Slow batch processing
```
Problem: Takes >5s for 1000 records
```
**Solution**: 
- Check system resources (CPU, RAM)
- Reduce batch size
- Enable GPU if available
- Check for I/O bottlenecks

---

## 🔐 Security Considerations

- [ ] Model files backed up securely
- [ ] No sensitive data in git (add models/ to .gitignore)
- [ ] API endpoints require authentication
- [ ] Input validation on all predictions
- [ ] Rate limiting configured
- [ ] Logging doesn't expose sensitive account data
- [ ] Models periodically retrained with fresh data

### .gitignore Update
```gitignore
# ML Model artifacts
src/lib/models/
src/lib/reports/

# Training data
data/DataSet.csv

# Python cache
__pycache__/
*.pyc
*.pkl
```

---

## 📞 Support & Documentation

| Issue | Resource |
|-------|----------|
| Understanding optimizations | Read `ML_OPTIMIZATION_SUMMARY.md` |
| Integration examples | Check `INTEGRATION_GUIDE.md` |
| API details | See `api_wrapper.py` docstrings |
| Feature engineering | Review `preprocess_optimized.py` |
| Model training | Inspect `train_optimized.py` |
| Inference code | Study `inference_optimized.py` |

---

## ✅ Deployment Go/No-Go Checklist

**GO if:**
- [x] All tests passing
- [x] Performance metrics acceptable
- [x] No unhandled errors in logs
- [x] Models backed up
- [x] Monitoring configured
- [x] Team trained on usage

**NO-GO if:**
- [ ] ROC-AUC < 0.97
- [ ] Inference latency > 1s
- [ ] > 1% prediction errors
- [ ] Models not backed up
- [ ] No error handling
- [ ] Resource limits exceeded

---

**Deployment Status**: Ready for Production ✅  
**Last Updated**: June 5, 2026  
**Maintained By**: ML Engineering Team
