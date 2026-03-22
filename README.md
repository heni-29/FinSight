# FinSight

AI-powered personal finance advisor. Connect your bank, track spending, and get real-time financial advice from llama-3.3-70b-versatile.

## Features

- AI chat advisor backed by your real transaction data (llama-3.3-70b-versatile with function calling)
- Bank account integration via Plaid Link
- Dashboard with spending summary and charts
- Transaction management with filters and manual entry
- Anomaly detection on unusual spending
- Streaming AI responses

## Stack

**Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic, Plaid, OpenAI

**Frontend:** React 18, Vite, React Query, Recharts, Axios

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL

### Backend

```bash
cd finance-advisor

python3 -m venv .venv
source .venv/bin/activate

pip install -e .

cp .env.example .env
# Fill in your credentials in .env

createdb finsight
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd finance-advisor-ui
npm install
npm run dev
```

Open http://localhost:5173

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key (random 32+ chars) |
| `PLAID_CLIENT_ID` | From dashboard.plaid.com |
| `PLAID_SECRET` | Plaid sandbox or production secret |
| `PLAID_ENV` | `sandbox` or `production` |
| `GROQ_API_KEY` | From console.groq.com |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte key for AES-256 |

Generate keys:

```bash
# SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY
python3 -c "import secrets, base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
```

### Docker

```bash
cd finance-advisor
cp .env.example .env
docker compose up
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/transactions` | List transactions |
| POST | `/transactions` | Add a transaction |
| GET | `/transactions/summary` | Monthly summary |
| GET | `/transactions/categories` | Available categories |
| DELETE | `/transactions/{id}` | Delete a transaction |
| POST | `/plaid/link-token` | Get Plaid Link token |
| POST | `/plaid/exchange` | Connect bank account |
| POST | `/plaid/sync` | Sync latest transactions |
| POST | `/advisor/chat` | Streaming AI chat |

All endpoints except `/auth/*` require `Authorization: Bearer <token>`.

## License

MIT
