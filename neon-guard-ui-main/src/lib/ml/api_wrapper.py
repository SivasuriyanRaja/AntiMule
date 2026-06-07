"""
api_wrapper.py
Simple REST API wrapper for ML predictions.
Can be wrapped with FastAPI for production use.

Usage with FastAPI:
    from fastapi import FastAPI
    from api_wrapper import router
    
    app = FastAPI()
    app.include_router(router)
"""

from inference_optimized import get_detector, MuleDetectorOptimized
from typing import Dict, List, Optional
import pandas as pd
import json


class MLPredictorAPI:
    """Wrapper for ML predictions with result formatting."""
    
    def __init__(self):
        self.detector = get_detector()
    
    def predict_account(self, account_data: Dict) -> Dict:
        """
        Predict mule status for a single account.
        
        Args:
            account_data: Dict with account features
            
        Returns:
            Prediction dict with risk assessment
        """
        try:
            result = self.detector.predict_single(account_data)
            return {
                'status': 'success',
                'prediction': result
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def predict_batch(self, accounts_data: List[Dict]) -> Dict:
        """
        Predict mule status for multiple accounts.
        
        Args:
            accounts_data: List of account dicts
            
        Returns:
            Predictions for all accounts with summary stats
        """
        try:
            df = pd.DataFrame(accounts_data)
            df_results = self.detector.predict_batch(df)
            
            # Generate summary statistics
            mule_count = (df_results['prediction'] == 1).sum()
            critical_count = (df_results['risk_tier'] == 'CRITICAL').sum()
            high_count = (df_results['risk_tier'] == 'HIGH').sum()
            avg_risk_score = df_results['risk_score'].mean()
            
            summary = {
                'total_accounts': len(df_results),
                'mule_count': int(mule_count),
                'mule_percentage': round(100 * mule_count / len(df_results), 2),
                'critical_count': int(critical_count),
                'high_count': int(high_count),
                'average_risk_score': round(avg_risk_score, 2),
                'processing_time_ms': 'N/A',  # Add timing if needed
            }
            
            return {
                'status': 'success',
                'summary': summary,
                'predictions': df_results.to_dict(orient='records')
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def get_risk_distribution(self, predictions: List[Dict]) -> Dict:
        """Analyze risk tier distribution."""
        tiers = {}
        for pred in predictions:
            tier = pred.get('risk_tier', 'UNKNOWN')
            tiers[tier] = tiers.get(tier, 0) + 1
        
        return {
            'distribution': tiers,
            'by_percentage': {
                tier: round(100 * count / len(predictions), 2)
                for tier, count in tiers.items()
            }
        }


# FastAPI endpoints (optional)
try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    
    app = FastAPI(title="Mule Detection API", version="2.0")
    predictor = MLPredictorAPI()
    
    class AccountData(BaseModel):
        F115: Optional[float] = None
        F321: Optional[float] = None
        F527: Optional[float] = None
        F531: Optional[float] = None
        F670: Optional[float] = None
        F1692: Optional[float] = None
        F2082: Optional[float] = None
        F2122: Optional[float] = None
        F2230: Optional[str] = None
        F2582: Optional[float] = None
        F2678: Optional[float] = None
        F2737: Optional[float] = None
        F2956: Optional[float] = None
        F3043: Optional[float] = None
        F3836: Optional[float] = None
        F3886: Optional[str] = None
        F3887: Optional[float] = None
        F3888: Optional[str] = None
        F3889: Optional[str] = None
        F3890: Optional[str] = None
        F3891: Optional[str] = None
        F3892: Optional[str] = None
        F3893: Optional[str] = None
        F3894: Optional[float] = None
        
        class Config:
            schema_extra = {
                "example": {
                    "F115": 1.5,
                    "F321": 1.0,
                    "F670": 0.75,
                    "F3836": 450,
                    "F3894": 8,
                }
            }
    
    @app.post("/predict")
    async def predict_single(account: AccountData):
        """
        Predict mule status for a single account.
        
        - **F115-F3894**: Account feature values
        - Returns: Risk assessment with probability and tier
        """
        result = predictor.predict_account(account.dict())
        if result['status'] == 'error':
            raise HTTPException(status_code=400, detail=result['error'])
        return result['prediction']
    
    @app.post("/predict/batch")
    async def predict_batch(accounts: List[AccountData]):
        """
        Predict mule status for multiple accounts.
        
        - **accounts**: List of account dicts
        - Returns: Predictions + distribution summary
        """
        accounts_dict = [acc.dict() for acc in accounts]
        result = predictor.predict_batch(accounts_dict)
        if result['status'] == 'error':
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {
            'status': 'healthy',
            'model': 'MuleDetectorOptimized v2.0',
            'version': '2.0.0'
        }
    
except ImportError:
    # FastAPI not installed - that's ok, can still use MLPredictorAPI directly
    pass


if __name__ == '__main__':
    # Test the API wrapper
    api = MLPredictorAPI()
    
    # Test single prediction
    test_account = {
        'F115': 1.5, 'F321': 1.0, 'F527': 500, 'F531': 600,
        'F670': 0.75, 'F1692': 0.8, 'F2082': 100, 'F2122': 110,
        'F2230': 'ACTIVE', 'F2582': 2.5, 'F2678': 50,
        'F2737': 1000, 'F2956': 5, 'F3043': 0.9,
        'F3836': 450, 'F3886': 'INV', 'F3887': 2000,
        'F3888': '2023-01-15', 'F3889': 'XX', 'F3890': 'YY',
        'F3891': 'INDIVIDUAL', 'F3892': 'ZZ', 'F3893': 'AA',
        'F3894': 8,
    }
    
    result = api.predict_account(test_account)
    print("Single Prediction Result:")
    print(json.dumps(result, indent=2))
