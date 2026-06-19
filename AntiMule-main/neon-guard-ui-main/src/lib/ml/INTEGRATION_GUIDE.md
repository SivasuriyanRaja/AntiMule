# ML Integration Guide for Neon Guard UI

## Quick Reference

### Files Created
```
src/lib/ml/
├── preprocess_optimized.py      ← Feature engineering (vectorized)
├── train_optimized.py           ← Model training with threshold tuning
├── inference_optimized.py       ← Optimized predictions
├── api_wrapper.py              ← REST API wrapper
├── requirements.txt            ← Python dependencies
└── ML_OPTIMIZATION_SUMMARY.md  ← Full documentation
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# From project root
pip install -r src/lib/ml/requirements.txt
```

### 2. Train Models (One-Time)
```bash
cd src/lib/ml
python train_optimized.py ../../../data/DataSet.csv
```

Outputs:
- `src/lib/models/` - Best model + backups
- `src/lib/reports/` - Metrics and feature importances

### 3. Start Using Predictions

#### Option A: Python Direct
```python
from src.lib.ml.inference_optimized import get_detector

detector = get_detector()
result = detector.predict_single({'F115': 1.5, 'F321': 1.0, ...})
```

#### Option B: REST API
```bash
# Install FastAPI (optional)
pip install fastapi uvicorn

# Run server
python -m src.lib.ml.api_wrapper

# API available at http://localhost:8000
```

---

## 📦 Integration with React/TypeScript

### Option 1: Python subprocess (Recommended for small deployments)

**`src/lib/api/ml-predictor.ts`** (Create this file)
```typescript
import { spawn } from 'child_process';
import path from 'path';

export interface PredictionResult {
  ml_probability: number;
  anomaly_score: number;
  composite_probability: number;
  risk_score: number;
  risk_tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  prediction: 0 | 1;
  prediction_label: string;
  confidence: number;
  alerts: string[];
}

export async function predictAccount(
  accountData: Record<string, any>
): Promise<PredictionResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      __dirname,
      '../ml/inference_optimized.py'
    );
    
    const python = spawn('python', [scriptPath]);
    
    let result = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python error: ${error}`));
      } else {
        try {
          const parsed = JSON.parse(result);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse prediction: ${result}`));
        }
      }
    });
    
    // Send input as JSON
    python.stdin.write(JSON.stringify(accountData));
    python.stdin.end();
  });
}

export async function predictBatch(
  accounts: Record<string, any>[]
): Promise<any[]> {
  // Similar to above but for batch processing
  // Can be optimized with streaming
}
```

### Option 2: FastAPI Microservice (Recommended for production)

**`src/lib/api/ml-client.ts`**
```typescript
const ML_API_BASE = process.env.ML_API_URL || 'http://localhost:8000';

export interface PredictionResult {
  ml_probability: number;
  anomaly_score: number;
  composite_probability: number;
  risk_score: number;
  risk_tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  prediction: 0 | 1;
  prediction_label: string;
  confidence: number;
  alerts: string[];
}

export async function predictAccount(
  accountData: Record<string, any>
): Promise<PredictionResult> {
  const response = await fetch(`${ML_API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });
  
  if (!response.ok) {
    throw new Error(`Prediction failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function predictBatch(
  accounts: Record<string, any>[]
): Promise<{
  summary: {
    total_accounts: number;
    mule_count: number;
    mule_percentage: number;
    critical_count: number;
    high_count: number;
    average_risk_score: number;
  };
  predictions: any[];
}> {
  const response = await fetch(`${ML_API_BASE}/predict/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accounts),
  });
  
  if (!response.ok) {
    throw new Error(`Batch prediction failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## 🎯 Usage Examples

### Single Account Prediction
```typescript
// In a React component
import { predictAccount, PredictionResult } from '@/lib/api/ml-client';

export function AccountRiskCard({ accountId }: { accountId: string }) {
  const [prediction, setPrediction] = React.useState<PredictionResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const accountData = {
        F115: 1.5,
        F321: 1.0,
        F527: 500,
        // ... other features
      };
      const result = await predictAccount(accountData);
      setPrediction(result);
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!prediction) {
    return <button onClick={handlePredict}>Check Risk</button>;
  }

  return (
    <div style={{ backgroundColor: prediction.tier_color, padding: '1rem' }}>
      <h3>{prediction.prediction_label}</h3>
      <p>Risk Score: {prediction.risk_score}/100</p>
      <p>Confidence: {(prediction.confidence * 100).toFixed(1)}%</p>
      <ul>
        {prediction.alerts.map((alert, i) => (
          <li key={i}>{alert}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Batch Processing
```typescript
import { predictBatch } from '@/lib/api/ml-client';

export async function processBulkAccounts(accountsData: any[]) {
  const result = await predictBatch(accountsData);
  
  console.log(`Processed ${result.summary.total_accounts} accounts`);
  console.log(`Found ${result.summary.mule_count} suspicious accounts`);
  console.log(`Average risk score: ${result.summary.average_risk_score}`);
  
  // Export results
  const csv = convertToCsv(result.predictions);
  downloadCsv(csv, `batch-predictions-${Date.now()}.csv`);
}
```

---

## ⚙️ Production Deployment

### Docker Setup for ML Service

**`docker-compose.ml.yml`** (Optional)
```yaml
version: '3.8'
services:
  ml-api:
    build:
      context: .
      dockerfile: Dockerfile.ml
    ports:
      - "8000:8000"
    volumes:
      - ./src/lib/models:/app/models
      - ./src/lib/ml:/app/ml
    environment:
      - PYTHONUNBUFFERED=1
    command: uvicorn src.lib.ml.api_wrapper:app --host 0.0.0.0 --port 8000
```

**`Dockerfile.ml`**
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY src/lib/ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/lib/ml/ /app/ml/
COPY src/lib/models/ /app/models/

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "ml.api_wrapper:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables
```bash
# .env for ML service
ML_API_URL=http://ml-api:8000
ML_TIMEOUT=30000  # milliseconds
ML_BATCH_SIZE=1000
```

---

## 📊 Monitoring & Logging

### Add Logging to Predictions
```typescript
export async function predictAccountWithLogging(
  accountData: Record<string, any>,
  accountId: string
): Promise<PredictionResult> {
  const startTime = Date.now();
  
  try {
    const result = await predictAccount(accountData);
    const duration = Date.now() - startTime;
    
    console.log(`✓ Prediction for ${accountId}:`, {
      duration,
      riskTier: result.risk_tier,
      prediction: result.prediction_label,
    });
    
    return result;
  } catch (error) {
    console.error(`✗ Prediction failed for ${accountId}`, error);
    throw error;
  }
}
```

### Alert on High-Risk Predictions
```typescript
export function useAlertOnHighRisk(
  prediction: PredictionResult | null
) {
  React.useEffect(() => {
    if (prediction?.risk_tier === 'CRITICAL') {
      // Send to monitoring system
      fetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          severity: 'critical',
          prediction,
          timestamp: new Date(),
        }),
      });
    }
  }, [prediction]);
}
```

---

## 🔄 Performance Tips

### Caching Predictions
```typescript
const predictionCache = new Map<string, PredictionResult>();
const CACHE_TTL = 3600000; // 1 hour

export async function getCachedPrediction(
  accountId: string,
  accountData: Record<string, any>
): Promise<PredictionResult> {
  const cached = predictionCache.get(accountId);
  
  if (cached && Date.now() - (cached as any).timestamp < CACHE_TTL) {
    return cached;
  }
  
  const result = await predictAccount(accountData);
  (result as any).timestamp = Date.now();
  predictionCache.set(accountId, result);
  
  return result;
}
```

### Batch Processing Optimization
```typescript
async function processBatchOptimized(
  accounts: AccountData[],
  batchSize: number = 100
) {
  const batches = [];
  
  for (let i = 0; i < accounts.length; i += batchSize) {
    batches.push(accounts.slice(i, i + batchSize));
  }
  
  // Process all batches in parallel
  const results = await Promise.all(
    batches.map(batch => predictBatch(batch))
  );
  
  // Flatten results
  return results.flatMap(r => r.predictions);
}
```

---

## 🐛 Troubleshooting

### Model Not Found
```
Error: models/best_model.pkl not found
```
**Solution**: Run `python train_optimized.py` first

### Prediction Timeout
```
Error: Prediction timed out after 30000ms
```
**Solution**: Increase timeout in env or use batch processing

### Out of Memory for Batch
```
Error: Unable to allocate X.XX GiB
```
**Solution**: Reduce batch size from 1000 to 100-500

---

## 📝 Next Steps

1. **Verify Predictions**: Compare with original mule_detection module outputs
2. **Deploy Models**: Move `src/lib/models` to secure location
3. **Set Up Monitoring**: Add logging and alerting
4. **Performance Test**: Load test with realistic batch sizes
5. **A/B Testing** (optional): Run alongside original model for validation

---

**Version**: 2.0.0  
**Last Updated**: June 5, 2026  
**Status**: Ready for Integration ✅
