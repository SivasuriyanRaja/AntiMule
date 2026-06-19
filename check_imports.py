import sys
sys.path.insert(0, 'neon-guard-ui-main/src/lib/ml')
import fastapi, pandas, xgboost, lightgbm, catboost, sklearn, joblib
from train_optimized import train_pipeline_optimized
from inference_optimized import get_detector
print("ALL OK - all packages and ML modules importable")
