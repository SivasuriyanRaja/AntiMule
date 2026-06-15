# AntiMule — Deployment Guide

This project has two parts:
- **Frontend** (`neon-guard-ui-main/`) → Deploy to **Vercel**
- **Backend** (`main.py`) → Deploy to **Railway** or **Render** (not Vercel — ML deps are too large)

---

## Step 1 — Deploy the Backend (Railway)

The Python backend requires MongoDB, MySQL, and heavy ML libraries (XGBoost, LightGBM, CatBoost, SHAP).
Railway is the easiest platform for this.

### Option A: Railway (recommended)

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **Deploy from GitHub repo** → select this repo
3. Set the **root directory** to `/` (repo root, where `main.py` lives)
4. Railway auto-detects Python via `requirements.txt` and uses the Procfile

**Set these environment variables in Railway:**

| Variable | Value |
|---|---|
| `DB_BACKEND` | `mongodb` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `MONGO_DB` | `antimule` |
| `MYSQL_HOST` | Your MySQL host (PlanetScale, Railway MySQL, etc.) |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | Your MySQL username |
| `MYSQL_PASSWORD` | Your MySQL password |
| `MYSQL_DB` | `antimule` |
| `JWT_SECRET` | A strong random string (run: `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `PORT` | Set automatically by Railway |

After deploy, note your backend URL (e.g. `https://antimule-backend.railway.app`).

### Option B: Render

Use the provided `render.yaml` — just connect your GitHub repo at [render.com](https://render.com).
Fill in the secret env vars in Render's dashboard after the service is created.

---

## Step 2 — Set up Databases

### MongoDB (required for ML data)
- Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com)
- Get the connection string: `mongodb+srv://user:pass@cluster.mongodb.net`
- Use `antimule` as the database name

### MySQL (required for user auth)
- Option A: Add a MySQL plugin in Railway (easiest)
- Option B: Use [PlanetScale](https://planetscale.com) (free tier)
- Run the schema: `mysql -u user -p antimule < db/schema.sql`

---

## Step 3 — Deploy the Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `neon-guard-ui-main`
4. Vercel auto-detects Vite — the `vercel.json` handles the rest

**Set this environment variable in Vercel:**

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your backend URL from Step 1, e.g. `https://antimule-backend.railway.app` |

> ⚠️ Important: Add the env var **before** the first deploy, or redeploy after adding it.
> Vite bakes `VITE_*` variables into the static bundle at build time.

5. Click **Deploy**

---

## Step 4 — Update Backend CORS

Once you have the Vercel frontend URL, update `main.py` to restrict CORS to your domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Redeploy the backend after this change.

---

## Local Development

```bash
# Backend
pip install -r requirements.txt
cp .env.example .env   # fill in your values
python main.py         # starts on :8005

# Frontend (in a separate terminal)
cd neon-guard-ui-main
cp .env.example .env.local   # VITE_API_URL=http://localhost:8005
bun install
bun run dev            # starts on :8080
```

---

## File Summary

| File | Purpose |
|---|---|
| `requirements.txt` | Python dependencies for the backend |
| `Procfile` | Tells Railway/Heroku how to start the server |
| `render.yaml` | Render deployment config |
| `.env.example` | Backend env var template |
| `neon-guard-ui-main/vercel.json` | Vercel deployment config (SPA rewrites) |
| `neon-guard-ui-main/.env.example` | Frontend env var template |
