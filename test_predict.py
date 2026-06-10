import sys
import os

# Add ml folder to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'neon-guard-ui-main', 'src', 'lib', 'ml'))

from inference_optimized import get_detector
import traceback

payload = {
    "F3894": "12",
    "F2737": "200.00",
    "F3836": "10",
    "F2582": "1.0",
    "F3888_age_days": "90",
    "F1692": "0.5",
    "F670": "0.85",
    "F3891": "INDIVIDUAL"
}

try:
    detector = get_detector()
    result = detector.predict_single(payload)
    print("SUCCESS!")
    print(result)
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
