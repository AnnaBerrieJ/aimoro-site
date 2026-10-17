# AIMORO

**Anything from China, delivered to your door in The Bahamas.** Live at [aimoro.co](https://aimoro.co).

Customers sign up, describe a product (photo or link), and get one quote in BSD covering the product, shipping to their address and AIMORO's service fee. AIMORO sources it on Taobao / Pinduoduo / 1688, orders it, checks it at a China warehouse, ships it in a consolidated shipment, and delivers it to the address on the request. **Delivery to that address is the end of AIMORO's service.**

Sourcing details (supplier links, CNY prices, margin, supplier order numbers, warehouse notes, freight cost) are admin-only and never returned by customer endpoints — the test suite checks this.

## Pages

| Who | Page | Purpose |
|---|---|---|
| Everyone | `/` | Home: how it works, sign up / log in |
| Customer | `/signup`, `/login` | Account with phone/WhatsApp, island, address |
| Customer | `/my-requests`, `/my-requests/new`, `/my-requests/[id]` | Submit requests (photo/link, delivery address), approve quote, invoice PDF, pay, shipping progress, timeline |
| Admin | `/admin`, `/admin/requests/[id]` | Request queue; sourcing listings; quote builder with live preview and private margin; mark paid; supplier order; warehouse check; timeline with WhatsApp share; email log |
| Admin | `/admin/shipments`, `/admin/shipments/[id]` | Combine ordered items into one shipment; mark shipped → delivered (updates and emails every customer in it) |

## How an order moves

received → sourcing → quote ready → paid → ordered → shipped → delivered

**Quote formula** (`backend/agent/pricing.py`): total = (¥ price × qty + ¥ China shipping) × FX + shipping to the customer's address + service fee (default 12%, minimum $15). FX (CNY→USD, = BSD) is fetched daily and frozen on each quote; quotes expire after 7 days.

## Tech stack

- **Backend:** FastAPI, SQLAlchemy (SQLite locally, Postgres in production), JWT auth, fpdf2 invoices, optional Stripe Checkout, optional Resend email
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS

## Run locally

```bash
cp .env.example .env            # fill in values

cd backend
pip install -r requirements.txt
ADMIN_EMAILS=you@example.com uvicorn main:app --reload   # sign up with that email to get admin
pytest tests                                              # 24 tests

cd ../frontend-next
npm install
npm run dev                     # http://localhost:3000
```

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `SECRET_KEY` | backend | Signs login tokens (required in production; the server refuses to start on Render without it) |
| `ADMIN_EMAILS` | backend | Signing up with one of these emails creates an admin account |
| `DATABASE_URL` | backend | Postgres URL in production; unset = SQLite `backend/agent.db` |
| `ALLOWED_ORIGINS` | backend | Comma-separated CORS allowlist (add the site URL) |
| `SITE_URL` | backend | Public site URL, used in emails and Stripe return links |
| `DEFAULT_CNY_USD` | backend | Fallback exchange rate if the rate API is unreachable |
| `STRIPE_SECRET_KEY` | backend | Optional: card payments. Unset = bank transfer + "Mark paid" |
| `BANK_TRANSFER_INSTRUCTIONS` | backend | Shown to customers on unpaid invoices |
| `RESEND_API_KEY`, `EMAIL_FROM` | backend | Optional: customer emails. Unset = emails logged as "skipped" |
| `UPLOAD_DIR` | backend | Where customer photos are stored (use a persistent disk in production) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | backend | Optional: mirror each request to Google Drive and the order tracker sheet (`backend/agent/gsync.py`). Get the refresh token with `backend/scripts/google_auth.py` |
| `GDRIVE_ORDERS_FOLDER_ID`, `GSHEET_TRACKER_ID`, `GSHEET_TRACKER_TAB` | backend | Drive folder for order folders, and the tracker spreadsheet + tab (default `Orders`). `POST /admin/gsync` re-syncs every request |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | Backend URL (defaults to `http://127.0.0.1:8000`) |

## Deployment

Both services run on Render as separate Web Services:

- **Backend:** Root Directory `backend` (Dockerfile). Set the backend variables above.
- **Frontend:** Root Directory `frontend-next`. Build `npm install && npm run build`, start `npm start`. Set `NEXT_PUBLIC_API_BASE_URL`.
- The custom domain (`aimoro.co`) is attached to the frontend service.

## Project structure

```
backend/
  main.py                 FastAPI app; mounts the routers below
  agent/
    models.py             Users, requests, supplier listings, quotes, invoices, shipments, timeline, notifications
    pricing.py            Quote formula
    routers/auth.py       Sign up / log in
    routers/customer.py   Requests, photos, approve quote, invoices, payment
    routers/admin.py      Queue, listings, quote builder, mark paid
    routers/operations.py Supplier order, warehouse check, shipments
    notify.py             Timeline events + email notifications
    invoice_pdf.py        Invoice PDFs
    payments.py           Optional Stripe Checkout
  tests/                  pytest suite
frontend-next/
  app/                    Pages listed above
  components/             App shell, sidebar, mobile nav, auth, shared UI
  lib/agent.ts            API client and types
```

The backend still contains the earlier supplier-ranking code (`suppliers.py`, `ml/`, `/suppliers`, `/model-info`); no page uses it now. It can be reused later to rank sourcing listings.
