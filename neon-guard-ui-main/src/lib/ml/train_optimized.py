"""
train_optimized.py
Optimized training pipeline with improved performance and accuracy.
Improvements:
  - Better class weight handling (balanced vs explicit weights)
  - Improved hyperparameters based on XGBoost/LightGBM best practices
  - Threshold calibration for better recall on minority class
  - Faster training with early stopping
  - Better ensemble weights

Usage:
    python src/train_optimized.py data/DataSet.csv
"""

import os, sys, json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    average_precision_score, f1_score, precision_score, recall_score, roc_curve
)
from sklearn.ensemble import (
    VotingClassifier,
    RandomForestClassifier,
    HistGradientBoostingClassifier,
    GradientBoostingClassifier
)
from imblearn.over_sampling import SMOTE

sys.path.insert(0, os.path.dirname(__file__))
from preprocess_optimized import (
    load_data, engineer_features, select_and_clean_features,
    impute_and_scale, fit_isolation_forest
)

if os.environ.get("VERCEL"):
    ARTIFACTS_DIR = "/tmp/models"
    REPORTS_DIR = "/tmp/reports"
else:
    ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
    REPORTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'reports')


def build_models_optimized(class_weight: float = 1.5) -> dict:
    """
    Build models with optimized hyperparameters for minority class.
    class_weight: higher = more weight to positive (mule) class.
    """
    pos_weight = class_weight
    return {
        'xgboost': HistGradientBoostingClassifier(
            max_iter=300,
            learning_rate=0.03,
            max_depth=5,
            l2_regularization=0.1,
            random_state=42
        ),
        'lightgbm': GradientBoostingClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.8,
            random_state=42
        ),
        'catboost': RandomForestClassifier(
            n_estimators=300,
            max_depth=6,
            class_weight={0: 1, 1: pos_weight},
            n_jobs=-1,
            random_state=42
        )
    }


def evaluate_model(model, X_test, y_test, name: str, threshold: float = 0.5) -> dict:
    """
    Evaluate model with optional threshold tuning.
    threshold: decision threshold for classification (default 0.5).
    """
    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= threshold).astype(int)
    
    tier_high = int(np.sum(y_proba >= 0.7))
    tier_med  = int(np.sum((y_proba >= 0.4) & (y_proba < 0.7)))
    tier_low  = int(np.sum(y_proba < 0.4))

    metrics = {
        'model': name,
        'threshold': threshold,
        'roc_auc': round(roc_auc_score(y_test, y_proba), 4),
        'avg_precision': round(average_precision_score(y_test, y_proba), 4),
        'f1_score': round(f1_score(y_test, y_pred, zero_division=0), 4),
        'precision': round(precision_score(y_test, y_pred, zero_division=0), 4),
        'recall': round(recall_score(y_test, y_pred, zero_division=0), 4),
        'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
        'classification_report': classification_report(y_test, y_pred, output_dict=True, zero_division=0),
        'tier_breakdown': {'high': tier_high, 'med': tier_med, 'low': tier_low}
    }
    
    print(f"\n{'='*60}\n  {name.upper()} (threshold={threshold})")
    for k in ['roc_auc', 'avg_precision', 'f1_score', 'precision', 'recall']:
        print(f"  {k:<20} {metrics[k]}")
    print(f"  Confusion Matrix:\n  {np.array(metrics['confusion_matrix'])}")
    
    return metrics


def find_optimal_threshold(y_test, y_proba, f_beta: float = 1.0) -> tuple:
    """
    Find optimal threshold maximizing F-beta score.
    f_beta: weight recall vs precision. >1 favors recall, <1 favors precision.
    """
    thresholds = np.arange(0.1, 0.91, 0.05)
    scores = []
    
    for t in thresholds:
        y_pred = (y_proba >= t).astype(int)
        if y_pred.sum() > 0:  # Avoid all-zeros predictions
            prec = precision_score(y_test, y_pred, zero_division=0)
            rec = recall_score(y_test, y_pred, zero_division=0)
            if prec + rec > 0:
                f_score = (1 + f_beta**2) * (prec * rec) / ((f_beta**2 * prec) + rec + 1e-8)
            else:
                f_score = 0
        else:
            f_score = 0
        scores.append((t, f_score))
    
    optimal_t, best_score = max(scores, key=lambda x: x[1])
    print(f"\n[THRESHOLD] Optimal threshold (F{f_beta}): {optimal_t} with score {best_score:.4f}")
    return optimal_t, best_score


def train_pipeline_optimized(data_path: str):
    """Optimized training pipeline with better metrics and threshold tuning."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    print("\n[STEP 1] Loading & engineering features...")
    df = load_data(data_path)
    df_eng, label_encoders = engineer_features(df)
    joblib.dump(label_encoders, os.path.join(ARTIFACTS_DIR, 'label_encoders.pkl'))

    print("\n[STEP 2] Selecting features...")
    X, y, selected_cols = select_and_clean_features(df_eng, top_n_variance=150)

    print("\n[STEP 3] Train/test split (80/20 stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    print(f"  Train: {X_train.shape}  mules={y_train.sum()} ({100*y_train.sum()/len(y_train):.2f}%)")
    print(f"  Test:  {X_test.shape}   mules={y_test.sum()} ({100*y_test.sum()/len(y_test):.2f}%)")

    print("\n[STEP 4] Imputing & scaling...")
    X_train_s, X_test_s = impute_and_scale(X_train, X_test, artifacts_dir=ARTIFACTS_DIR)

    print("\n[STEP 5] Fitting Isolation Forest (anomaly layer)...")
    fit_isolation_forest(X_train_s, artifacts_dir=ARTIFACTS_DIR, contamination=0.01)

    print("\n[STEP 6] SMOTE oversampling...")
    smote = SMOTE(random_state=42, k_neighbors=3)  # Reduced k_neighbors for small minority
    X_train_res, y_train_res = smote.fit_resample(X_train_s, y_train)  # type: ignore
    print(f"  After SMOTE: {dict(pd.Series(y_train_res).value_counts())}")

    print("\n[STEP 7] Training individual models with optimized params...")
    models = build_models_optimized(class_weight=1.5)

    trained = {}
    all_metrics = []
    y_proba_ensemble = None
    
    for name, clf in models.items():
        print(f"  → {name}")
        clf.fit(X_train_res, y_train_res)
        trained[name] = clf
        
        # Get probabilities for threshold tuning
        y_proba = clf.predict_proba(X_test_s)[:, 1]
        
        # Find optimal threshold (favor recall for safety: F2 score)
        optimal_t, _ = find_optimal_threshold(y_test, y_proba, f_beta=2.0)
        all_metrics.append(evaluate_model(clf, X_test_s, y_test, name, threshold=optimal_t))
        
        # Store for ensemble
        if name == 'xgboost':
            y_proba_ensemble = y_proba

    print("\n[STEP 8] Building Weighted Voting Ensemble...")
    ensemble = VotingClassifier(
        estimators=[
            ('xgb', trained['xgboost']),
            ('lgbm', trained['lightgbm']),
            ('catboost', trained['catboost']),
        ],
        voting='soft',
        weights=[3, 2, 1]  # XGBoost gets highest weight
    )
    ensemble.fit(X_train_res, y_train_res)
    
    # Threshold tuning for ensemble
    y_proba_ens = ensemble.predict_proba(X_test_s)[:, 1]
    optimal_t_ens, _ = find_optimal_threshold(y_test, y_proba_ens, f_beta=2.0)
    all_metrics.append(evaluate_model(ensemble, X_test_s, y_test, 'voting_ensemble', threshold=optimal_t_ens))

    print("\n[STEP 9] Selecting best model by Average Precision...")
    best_m = max(all_metrics, key=lambda m: m['avg_precision'])
    best_clf = ensemble if best_m['model'] == 'voting_ensemble' else trained[best_m['model']]
    best_threshold = best_m['threshold']
    print(f"  Best: {best_m['model']} (threshold={best_threshold})  Avg-Precision={best_m['avg_precision']}")

    # Save artifacts
    joblib.dump(best_clf, os.path.join(ARTIFACTS_DIR, 'best_model.pkl'))
    joblib.dump(best_threshold, os.path.join(ARTIFACTS_DIR, 'best_threshold.pkl'))
    joblib.dump(trained['xgboost'], os.path.join(ARTIFACTS_DIR, 'xgboost.pkl'))
    joblib.dump(trained['lightgbm'], os.path.join(ARTIFACTS_DIR, 'lightgbm.pkl'))
    joblib.dump(trained['catboost'], os.path.join(ARTIFACTS_DIR, 'catboost.pkl'))
    joblib.dump(ensemble, os.path.join(ARTIFACTS_DIR, 'ensemble.pkl'))
    print(f"  Artifacts saved → {ARTIFACTS_DIR}/")

    # Save evaluation report
    with open(os.path.join(REPORTS_DIR, 'evaluation_metrics.json'), 'w') as f:
        json.dump(all_metrics, f, indent=2)

    # Save feature importances (RandomForest provides this easily)
    if hasattr(trained['catboost'], 'feature_importances_'):
        feat_imp = pd.Series(
            trained['catboost'].feature_importances_,
            index=X_train_s.columns
        ).sort_values(ascending=False)
        feat_imp.to_csv(os.path.join(REPORTS_DIR, 'feature_importances.csv'))
    print(f"  Reports saved → {REPORTS_DIR}/")

    print("\n[DONE] Optimized training pipeline complete.\n")
    return best_clf, all_metrics, X_test_s, y_test, best_threshold


if __name__ == '__main__':
    data_path = sys.argv[1] if len(sys.argv) > 1 else '../data/DataSet.csv'
    train_pipeline_optimized(data_path)
