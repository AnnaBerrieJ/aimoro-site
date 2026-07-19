# Aimoro Smart Sourcing

**Live demo: [aimoro.co](https://aimoro.co)** (backend API: [aimoro-backend.onrender.com](https://aimoro-backend.onrender.com))

Aimoro is a supplier-sourcing tool for ecommerce sellers evaluating Alibaba and AliExpress suppliers. You search by product, country, and price, and Aimoro ranks the results with a trained ML model, flags a risk level, and explains why each supplier is (or isn't) worth pursuing.

A FastAPI backend serves supplier data, scoring, and persistence. A Next.js frontend provides the search UI, comparison tables, analytics charts, and an OpenAI-powered sourcing assistant.

## Why it's interesting

The scoring engine used to be a fixed-weight formula (`price*0.35 + rating*0.30 + ...`). It's been replaced with a **trained GradientBoostingRegressor** (see `backend/ml/train_model.py`), evaluated against that original formula as a baseline on the same held-out test set:

| | MAE (lower is better) | R² (higher is better) |
|---|---|---|
| Fixed-weight formula (baseline) | 27.05 | -0.284 |
| Trained model | 17.05 | 0.491 |

The model cuts prediction error by **37%**, and the baseline formula actually performs *worse than predicting the mean* (negative R²) — a concrete, quantified argument for why the ML approach replaced the hand-tuned one. Feature importances and these metrics are exposed live via `GET /model-info`, so the ranking isn't a black box.

The training data is synthetic (`backend/ml/generate_dataset.py`) — Aimoro doesn't yet have real transaction outcomes to learn from. That's documented in the code, not hidden: the generator encodes domain assumptions (price, rating, delivery speed, verification, MOQ, platform) with realistic noise and correlations, and `label_quality()` is meant to be replaced with real outcome labels (saves, clicks, completed orders, disputes) once that data exists.

## Features

- **Supplier search** — filter by product, country, max price, verified-only
- **ML-ranked results** — `aimoro_score` from the trained model, with graceful fallback to the fixed formula if the model file isn't present
- **Risk scoring** — Low / Medium / High based on rating, delivery time, verification, and MOQ
- **Plain-language recommendations** — why a supplier scored the way it did
- **Save/compare suppliers** — persisted to SQLite, viewable and deletable later
- **Analytics dashboards** — price, score, platform, and risk distributions via Recharts
- **AI sourcing assistant** — OpenAI-backed chat for negotiation/risk/sourcing questions

## Architecture

```
┌─────────────────────┐         HTTP          ┌──────────────────────┐
│   Next.js frontend  │ ───────────────────▶  │   FastAPI backend    │
│  (frontend-next/)   │ ◀───────────────────  │   (backend/main.py)  │
└─────────────────────┘                        └──────────┬───────────┘
         │                                                 │
         │ /api/negotiate                 ┌────────────────┼────────────────┐
         │ /api/ai-assistant              ▼                ▼                ▼
         ▼                      backend/suppliers.py  backend/ml/*.joblib  backend/database.py
      OpenAI                     (supplier catalog)    (trained ranking     (SQLite: saved
                                                         model)              suppliers)
```

OpenAI is called server-side via Next.js API routes — the key is never exposed to the browser.

## Tech stack

- **Backend**: FastAPI, Uvicorn, SQLite
- **ML**: scikit-learn (`GradientBoostingRegressor`), pandas, joblib
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/suppliers?product=&country=&max_price=&verified=` | Ranked, filtered supplier list |
| GET | `/model-info` | Model status, evaluation metrics, feature importances, baseline comparison |
| POST | `/save-supplier/{supplier_id}` | Save a supplier to SQLite |
| GET | `/saved-suppliers` | List saved suppliers |
| DELETE | `/saved-suppliers/{saved_id}` | Remove a saved supplier |

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 20+

### 1. Clone and configure

```bash
git clone <this-repo>
cd aimoro-smart-sourcing
cp .env.example .env   # fill in OPENAI_API_KEY and NEXT_PUBLIC_API_BASE_URL
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API is now at `http://127.0.0.1:8000`. A pre-trained model ships in `backend/ml/`, so ranking works out of the box. To regenerate the dataset and retrain:

```bash
python ml/generate_dataset.py
python ml/train_model.py
```

### 3. Frontend

In a second terminal:

```bash
cd frontend-next
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

| Variable | Used by | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | frontend (server-side) | Powers the Negotiate and AI Assistant pages |
| `ALLOWED_ORIGINS` | backend | Comma-separated CORS allowlist |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | Backend URL the frontend calls (defaults to `http://127.0.0.1:8000`) |

## Deployment

Both services run on Render as separate Web Services:

- **Backend**: Root Directory `backend`, auto-detected via `backend/Dockerfile`. Env vars: `ALLOWED_ORIGINS` set to the frontend's URL.
- **Frontend**: Root Directory `frontend-next`, Node runtime. Build command: `npm install && npm run build`. Start command: `npm start`. Env vars: `OPENAI_API_KEY`, `NEXT_PUBLIC_API_BASE_URL` set to the backend's URL.
- The custom domain (`aimoro.co`) is attached to the **frontend** service in Render's Custom Domains settings.

## Project structure

```
backend/
  main.py                        FastAPI app: scoring, risk, recommendations, endpoints
  suppliers.py                   Loads the supplier catalog (supplier_catalog.json)
  supplier_catalog.json          250 generated suppliers across 4 countries, 10 products
  generate_supplier_catalog.py   Regenerates supplier_catalog.json
  database.py                    SQLite persistence for saved suppliers
  ml/
    generate_dataset.py          Synthetic training data generator
    train_model.py               Trains + evaluates the GradientBoostingRegressor
    supplier_model.joblib        Trained model (checked in so the app works out of the box)
    model_metrics.json           Evaluation metrics, feature importances, baseline comparison

frontend-next/
  app/
    page.tsx                     Dashboard
    find-suppliers/page.tsx      Supplier search, results, comparison table, analytics
    saved-suppliers/page.tsx     Saved supplier list with delete
    analytics/page.tsx           Charts for saved suppliers
    negotiate/page.tsx           AI-drafted negotiation message
    ai-assistant/page.tsx        OpenAI sourcing chat
    api/negotiate/route.ts       Server-side OpenAI route for negotiation drafts
    api/ai-assistant/route.ts    Server-side OpenAI route for sourcing questions
  components/                    Sidebar, MetricCard, SupplierCard, ScoreBox, RiskBadge, charts
  lib/
    types.ts                     TypeScript interfaces
    api.ts                       FastAPI client functions
```

## Future improvements

- Replace synthetic training labels with real outcome data (saves, completed orders, disputes) once available
- Wire up the AliExpress Affiliate API for real product listings (Alibaba/AliExpress don't expose a public "full vendor database" API, so the catalog is generated demo data — see `backend/generate_supplier_catalog.py`)
- Add automated tests for scoring/risk logic and API endpoints
- Add CI (lint + test) on push
