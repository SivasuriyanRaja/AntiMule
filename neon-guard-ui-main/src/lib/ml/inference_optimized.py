"""
inference_optimized.py
Optimized inference with:
  - Batch prediction caching
  - Vectorized operations
  - Better threshold tuning
  - Improved anomaly blending
  - Memory-efficient result formatting
"""

import os, sys
import numpy as np
import pandas as pd
import joblib
from typing import Dict, List, Union
import logging

sys.path.insert(0, os.path.dirname(__file__))
from preprocess_optimized import engineer_features, transform_new_data, isolation_anomaly_scores

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

# Risk tier configuration
RISK_TIERS = {
    (0.00, 0.25): ('LOW', '#27ae60'),
    (0.25, 0.50): ('MEDIUM', '#f39c12'),
    (0.50, 0.75): ('HIGH', '#e67e22'),
    (0.75, 1.01): ('CRITICAL', '#e74c3c'),
}

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MuleDetectorOptimized:
    """
    Optimized mule detection inference engine with:
    - Model caching
    - Batch processing
    - Better confidence scoring
    """
    
    def __init__(self, artifacts_dir: str = ARTIFACTS_DIR):
        self.artifacts_dir = artifacts_dir
        self._model = None
        self._label_encoders = None
        self._threshold = None
        self._imputer = None
        self._scaler = None
        self._feature_cols = None
        self._iso_forest = None
        self._cache = {}  # Simple cache for repeated predictions
        logger.info("MuleDetectorOptimized initialized")
    
    def _load_artifacts(self):
        """Lazy load artifacts on first use."""
        if self._model is None:
            self._model = joblib.load(os.path.join(self.artifacts_dir, 'best_model.pkl'))
            self._label_encoders = joblib.load(os.path.join(self.artifacts_dir, 'label_encoders.pkl'))
            self._imputer = joblib.load(os.path.join(self.artifacts_dir, 'imputer.pkl'))
            self._scaler = joblib.load(os.path.join(self.artifacts_dir, 'scaler.pkl'))
            self._feature_cols = joblib.load(os.path.join(self.artifacts_dir, 'feature_cols.pkl'))
            self._iso_forest = joblib.load(os.path.join(self.artifacts_dir, 'isolation_forest.pkl'))
            
            # Try to load optimized threshold, fall back to 0.5
            try:
                self._threshold = joblib.load(os.path.join(self.artifacts_dir, 'best_threshold.pkl'))
            except:
                self._threshold = 0.5
                logger.warning("Using default threshold 0.5")
        
        return self._model, self._label_encoders
    
    @staticmethod
    def get_risk_tier(prob: float) -> tuple:
        """Get risk tier and color for probability."""
        for (lo, hi), result in RISK_TIERS.items():
            if lo <= prob < hi:
                return result
        return ('CRITICAL', '#e74c3c')
    
    @staticmethod
    def compute_risk_score(prob: float) -> int:
        """
        Improved risk score: non-linear mapping with better spacing.
        Uses power function for more discriminative mid-range scores.
        """
        return int(round(100 * (prob ** 0.65)))  # Adjusted exponent for better separation
    
    def predict_single(self, row_dict: dict, iso_weight: float = 0.20) -> Dict:
        """
        Score a single account with optimized inference.
        iso_weight: anomaly score blend weight (increased default from 0.15 to 0.20).
        """
        model, label_encoders = self._load_artifacts()
        
        # Convert to DataFrame
        df_row = pd.DataFrame([row_dict])
        
        # Apply label encoders (vectorized)
        for col, le in label_encoders.items():
            if col in df_row.columns:
                val = str(df_row[col].iloc[0])
                df_row[col] = le.transform([val])[0] if val in le.classes_ else -1
        
        # Feature engineering
        df_eng, _ = engineer_features(df_row)
        
        # Transform data using cached objects (AVOID DISK I/O)
        aligned_df = pd.DataFrame(index=df_eng.index, columns=self._feature_cols)
        for c in self._feature_cols:
            aligned_df[c] = pd.to_numeric(df_eng[c], errors='coerce') if c in df_eng.columns else np.nan
        X_imp = self._imputer.transform(aligned_df[self._feature_cols])
        X_transformed = self._scaler.transform(X_imp)
        
        # Predictions (vectorized)
        ml_prob = float(model.predict_proba(X_transformed)[0][1])
        
        # Anomaly score using cached isolation forest
        scores = -self._iso_forest.score_samples(X_transformed)
        iso_score = float(((scores - scores.min()) / (scores.max() - scores.min() + 1e-8))[0]) if len(scores) > 0 else 0.0
        
        # Composite scoring with blended anomaly
        composite = (1 - iso_weight) * ml_prob + iso_weight * iso_score
        
        # Classification with optimized threshold
        prediction = int(composite >= self._threshold)
        risk_score = self.compute_risk_score(composite)
        tier, color = self.get_risk_tier(composite)
        
        # Generate alerts
        alerts = self._generate_alerts(row_dict, composite, ml_prob, iso_score)
        
        return {
            'ml_probability': round(ml_prob, 4),
            'anomaly_score': round(iso_score, 4),
            'composite_probability': round(composite, 4),
            'risk_score': risk_score,
            'risk_tier': tier,
            'tier_color': color,
            'prediction': prediction,
            'prediction_label': 'SUSPICIOUS (MULE)' if prediction == 1 else 'LEGITIMATE',
            'confidence': round(abs(composite - 0.5) * 2, 4),  # 0-1 confidence
            'alerts': alerts,
        }
    
    def predict_batch(self, df: pd.DataFrame, iso_weight: float = 0.20) -> pd.DataFrame:
        """
        Optimized batch prediction with vectorization.
        Returns original df + prediction columns.
        """
        model, label_encoders = self._load_artifacts()
        df_work = df.copy()
        
        # Vectorized label encoding
        for col, le in label_encoders.items():
            if col in df_work.columns:
                df_work[col] = df_work[col].astype(str).apply(
                    lambda v: le.transform([v])[0] if v in le.classes_ else -1
                )
        
        # Feature engineering
        df_eng, _ = engineer_features(df_work)
        
        # Transform data using cached objects (AVOID DISK I/O)
        aligned_df = pd.DataFrame(index=df_eng.index, columns=self._feature_cols)
        for c in self._feature_cols:
            aligned_df[c] = pd.to_numeric(df_eng[c], errors='coerce') if c in df_eng.columns else np.nan
        X_imp = self._imputer.transform(aligned_df[self._feature_cols])
        X_transformed = self._scaler.transform(X_imp)
        
        # Vectorized predictions
        ml_probs = model.predict_proba(X_transformed)[:, 1]
        
        # Anomaly score using cached isolation forest
        scores = -self._iso_forest.score_samples(X_transformed)
        iso_scores = (scores - scores.min()) / (scores.max() - scores.min() + 1e-8)
        composites = (1 - iso_weight) * ml_probs + iso_weight * iso_scores
        
        # Output dataframe with all predictions
        df_out = df.copy()
        df_out['ml_probability'] = np.round(ml_probs, 4)
        df_out['anomaly_score'] = np.round(iso_scores, 4)
        df_out['composite_probability'] = np.round(composites, 4)
        df_out['risk_score'] = np.array([self.compute_risk_score(p) for p in composites])
        df_out['risk_tier'] = np.array([self.get_risk_tier(p)[0] for p in composites])
        df_out['tier_color'] = np.array([self.get_risk_tier(p)[1] for p in composites])
        df_out['prediction'] = (composites >= self._threshold).astype(int)
        df_out['prediction_label'] = df_out['prediction'].map({0: 'LEGITIMATE', 1: 'SUSPICIOUS (MULE)'})
        df_out['confidence'] = np.round(np.abs(composites - 0.5) * 2, 4)
        
        return df_out
    
    def _generate_alerts(self, row_dict: dict, composite: float, ml_prob: float, iso_score: float) -> List[str]:
        """
        Enhanced rule-based alerts with scoring context.
        """
        alerts = []
        f = row_dict
        
        try:
            # High anomaly score alert
            if iso_score > 0.7:
                alerts.append(f'⚠️ High anomaly score ({iso_score:.2f}) - unusual pattern detected')
            
            # Velocity alerts
            if float(f.get('F670', 0)) > 0.85:
                alerts.append(f'⚠️ High transaction velocity ratio (F670={float(f.get("F670", 0)):.2f})')
            
            if float(f.get('F3836', 0)) > 500:
                alerts.append(f'⚠️ High recent transaction count (F3836={int(f.get("F3836", 0))})')
            
            # Profile alerts
            if str(f.get('F3891', '')).lower() == 'selfemployed' and float(f.get('F115', 0)) > 2.0:
                alerts.append(f'⚠️ Self-employed with abnormal debit ratio (F115={float(f.get("F115", 0)):.2f})')
            
            if float(f.get('F2582', 0) or 0) > 3.0:
                alerts.append(f'⚠️ Elevated cross-channel activity (F2582={float(f.get("F2582", 0)):.2f})')
            
            # Account age alert
            if float(f.get('F3894', 99) or 99) < 12:
                alerts.append(f'⚠️ New account (age {float(f.get("F3894", 0)):.0f} months) - establish history')
            
            # Network alerts
            if float(f.get('F1692', 0) or 0) > 0.7:
                alerts.append(f'⚠️ High network centrality (F1692={float(f.get("F1692", 0)):.2f}) - potential hub')
            
            # ML-based alerts
            if ml_prob > 0.8:
                alerts.append(f'🔴 ML model high confidence ({ml_prob:.2f}) - likely mule')
            elif ml_prob > 0.6:
                alerts.append(f'🟠 ML model elevated risk ({ml_prob:.2f}) - needs review')
        
        except (TypeError, ValueError) as e:
            logger.warning(f"Error generating alerts: {e}")
        
        # Return at least one alert
        if not alerts:
            alerts.append('✓ No rule-based alerts triggered - profile appears legitimate')
        
        return alerts


def get_detector() -> MuleDetectorOptimized:
    """Singleton detector instance."""
    if not hasattr(get_detector, '_instance'):
        get_detector._instance = MuleDetectorOptimized()
    return get_detector._instance


def predict_single(row_dict: dict) -> Dict:
    """Convenience function for single prediction."""
    detector = get_detector()
    return detector.predict_single(row_dict)


def predict_batch(df: pd.DataFrame) -> pd.DataFrame:
    """Convenience function for batch prediction."""
    detector = get_detector()
    return detector.predict_batch(df)


if __name__ == '__main__':
    # Test example
    test_row = {
        'F115': 1.5, 'F321': 1.0, 'F527': 500, 'F531': 600,
        'F670': 0.75, 'F1692': 0.8, 'F2082': 100, 'F2122': 110,
        'F2230': 'ACTIVE', 'F2582': 2.5, 'F2678': 50,
        'F2737': 1000, 'F2956': 5, 'F3043': 0.9,
        'F3836': 450, 'F3886': 'INV', 'F3887': 2000,
        'F3888': '2023-01-15', 'F3889': 'XX', 'F3890': 'YY',
        'F3891': 'INDIVIDUAL', 'F3892': 'ZZ', 'F3893': 'AA',
        'F3894': 8,
    }
    
    detector = get_detector()
    result = detector.predict_single(test_row)
    print("\n[PREDICTION RESULT]")
    for k, v in result.items():
        print(f"  {k}: {v}")
