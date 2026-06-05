"""
preprocess_optimized.py
Optimized data loading, cleaning, and feature engineering for mule detection.
Improvements:
  - Vectorized operations (avoid loops)
  - Efficient label encoding with caching
  - Faster ratio computation
  - Memory-efficient imputation
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import IsolationForest
import joblib
import os

KEY_FEATURES = [
    'F115', 'F321', 'F527', 'F531', 'F670',
    'F1692', 'F2082', 'F2122', 'F2582', 'F2678',
    'F2737', 'F2956', 'F3043', 'F3836', 'F3887',
    'F3889', 'F3891', 'F3894'
]
TARGET           = 'F3924'
CATEGORICAL_COLS = ['F2230', 'F3886', 'F3888', 'F3889', 'F3890', 'F3891', 'F3892', 'F3893']
RATIO_PAIRS      = [('F115', 'F321'), ('F527', 'F531'), ('F2082', 'F2122'), ('F2582', 'F2678')]


def load_data(filepath: str) -> pd.DataFrame:
    """Load CSV with optimized dtypes."""
    df = pd.read_csv(filepath, index_col=0, low_memory=False)
    print(f"[INFO] Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns")
    if TARGET in df.columns:
        print(f"[INFO] Target distribution:\n{df[TARGET].value_counts()}")
    return df


def engineer_features(df: pd.DataFrame):
    """Optimized feature engineering with vectorized operations."""
    df = df.copy()
    label_encoders = {}

    # Vectorized label encoding
    for col in CATEGORICAL_COLS:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = df[col].astype(str).fillna('UNKNOWN')
            df[col] = le.fit_transform(df[col])
            label_encoders[col] = le

    # Date parsing (vectorized)
    if 'F3888' in df.columns:
        try:
            dates = pd.to_datetime(df['F3888'], errors='coerce')
            df['F3888_year']     = dates.dt.year.fillna(0).astype(int)
            df['F3888_month']    = dates.dt.month.fillna(0).astype(int)
            df['F3888_age_days'] = (pd.Timestamp('today') - dates).dt.days.fillna(-1).astype(int)
            df.drop(columns=['F3888'], inplace=True)
        except Exception as e:
            print(f"[WARN] Error parsing F3888: {e}")
            df.drop(columns=['F3888'], errors='ignore', inplace=True)

    # Vectorized ratio computation
    for a, b in RATIO_PAIRS:
        if a in df.columns and b in df.columns:
            col_name = f'ratio_{a}_{b}'
            # Avoid division by zero - use numpy vectorization
            with np.errstate(divide='ignore', invalid='ignore'):
                df[col_name] = np.divide(df[a].values, df[b].values, 
                                         where=df[b].values != 0, 
                                         out=np.full_like(df[a].values, np.nan, dtype=float))
            df[col_name] = df[col_name].replace([np.inf, -np.inf], np.nan)

    # Interaction terms
    if 'F3836' in df.columns and 'F3894' in df.columns:
        df['velocity_age_interaction'] = df['F3836'].values * df['F3894'].values

    # Log transformations (vectorized)
    for col in ['F3836', 'F2737', 'F3887']:
        if col in df.columns:
            df[f'log_{col}'] = np.log1p(np.clip(df[col].values, 0, None))

    return df, label_encoders


def select_and_clean_features(df: pd.DataFrame, top_n_variance: int = 150):
    """Optimized feature selection with better handling."""
    df = df.copy()
    
    # Drop high-missing columns
    missing_rate = df.isnull().mean()
    high_missing = missing_rate[missing_rate > 0.80].index.tolist()
    df.drop(columns=high_missing, inplace=True, errors='ignore')
    print(f"[INFO] Dropped {len(high_missing)} columns with >80% missing")

    y = df[TARGET].copy()
    X = df.drop(columns=[TARGET], errors='ignore')
    X = X.select_dtypes(include=[np.number])

    # Feature prioritization
    key_present = [f for f in KEY_FEATURES if f in X.columns]
    engineered  = [c for c in X.columns if c.startswith(('ratio_', 'log_')) 
                   or c in ['velocity_age_interaction', 'F3888_year', 'F3888_month', 'F3888_age_days']]
    non_key     = [c for c in X.columns if c not in key_present and c not in engineered]

    # Variance-based selection (vectorized)
    if non_key:
        variances  = X[non_key].var().sort_values(ascending=False)
        top_by_var = variances.head(top_n_variance).index.tolist()
    else:
        top_by_var = []

    selected_cols = list(set(key_present + engineered + top_by_var))
    X = X[selected_cols]
    print(f"[INFO] Selected {len(selected_cols)} features")
    return X, y, selected_cols


def impute_and_scale(X_train, X_test=None, artifacts_dir='models'):
    """Optimized imputation and scaling with better memory efficiency."""
    os.makedirs(artifacts_dir, exist_ok=True)
    
    # Median imputation (more robust for skewed features)
    imputer = SimpleImputer(strategy='median')
    X_train_imp = imputer.fit_transform(X_train)
    
    # Scaling
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train_imp)
    
    # Save artifacts
    joblib.dump(imputer, os.path.join(artifacts_dir, 'imputer.pkl'))
    joblib.dump(scaler, os.path.join(artifacts_dir, 'scaler.pkl'))
    joblib.dump(X_train.columns.tolist(), os.path.join(artifacts_dir, 'feature_cols.pkl'))
    
    if X_test is not None:
        X_test_imp = imputer.transform(X_test)
        X_test_s = scaler.transform(X_test_imp)
        return pd.DataFrame(X_train_s, columns=X_train.columns), \
               pd.DataFrame(X_test_s, columns=X_test.columns)
    
    return pd.DataFrame(X_train_s, columns=X_train.columns), None


def transform_new_data(df: pd.DataFrame, artifacts_dir: str = 'models') -> np.ndarray:
    """Transform new data using saved artifacts (vectorized)."""
    imputer = joblib.load(os.path.join(artifacts_dir, 'imputer.pkl'))
    scaler = joblib.load(os.path.join(artifacts_dir, 'scaler.pkl'))
    
    X_imp = imputer.transform(df.select_dtypes(include=[np.number]))
    X_scaled = scaler.transform(X_imp)
    return X_scaled


def fit_isolation_forest(X_train: np.ndarray, artifacts_dir: str = 'models', contamination: float = 0.01):
    """Fit Isolation Forest for anomaly detection."""
    os.makedirs(artifacts_dir, exist_ok=True)
    iso_forest = IsolationForest(contamination=contamination, random_state=42, n_jobs=-1)
    iso_forest.fit(X_train)
    joblib.dump(iso_forest, os.path.join(artifacts_dir, 'isolation_forest.pkl'))
    print(f"[INFO] Isolation Forest fitted and saved")


def isolation_anomaly_scores(X: np.ndarray, artifacts_dir: str = 'models') -> np.ndarray:
    """Get anomaly scores from Isolation Forest (vectorized)."""
    iso_forest = joblib.load(os.path.join(artifacts_dir, 'isolation_forest.pkl'))
    # Convert decision function to probability (0-1 range)
    scores = -iso_forest.score_samples(X)  # Higher is more anomalous
    scores = (scores - scores.min()) / (scores.max() - scores.min() + 1e-8)
    return scores
