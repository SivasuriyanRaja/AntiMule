"""
__init__.py
ML module initialization for neon-guard-ui
"""

from .inference_optimized import (
    get_detector,
    predict_single,
    predict_batch,
    MuleDetectorOptimized,
)

__version__ = '2.0.0'
__all__ = [
    'get_detector',
    'predict_single',
    'predict_batch',
    'MuleDetectorOptimized',
]
