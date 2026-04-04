# Web Risk Analyzer

A website security assessment tool with a dual-backend architecture:
- **Node.js (Express)** — auth, users, scan history, admin
- **Python (Flask)** — security scanning engine, risk analysis

---

## Architecture

```
React Frontend (port 3000)
        ↓
Node.js Express API (port 5000)  ←→  Python Flask Scanner (port 5001)
        ↓
  JSON File Database
```

Node.js calls Flask for scan analysis. If Flask is unavailable, Node falls back to its own built-in scanner automatically.

---

## Local Development

### Prerequisites
- Node.js v18+
- Python 3.9+
- pip

---

### Step 1 — Python Flask Scanner

```bash
cd web-risk-analyzer/python-scanner
pip install -r requirements.txt
python app.py
```
Flask scanner runs at: **http://localhost:5001**

---

### Step 2 — Node.js Backend

```bash
cd web-risk-analyzer/backend
npm install --legacy-peer-deps
node server.js
```
Node backend runs at: **http://localhost:5000**

---

### Step 3 — React Frontend

```bash
cd web-risk-analyzer/frontend
npm install --legacy-peer-deps
npm run dev
```
Frontend runs at: **http://localhost:3000**

---

### Default Login
| Role  | Email         | Password |
|-------|---------------|----------|
| Admin | admin@wra.com | admin123 |

---

## Deploy to Render

### Service 1 — Python Flask Scanner

1. Render → New+ → **Web Service**
2. Connect your GitHub repo
3. Settings:

| Field | Value |
|-------|-------|
| Name | wra-scanner |
| Root Directory | `web-risk-analyzer/python-scanner` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app --bind 0.0.0.0:$PORT` |
| Instance Type | Free |

4. Environment Variables:
   - `FLASK_DEBUG` = `false`

5. Copy the service URL (e.g. `https://wra-scanner.onrender.com`)

---

### Service 2 — Node.js Backend + React Frontend

1. Render → New+ → **Web Service**
2. Connect same repo
3. Settings:

| Field | Value |
|-------|-------|
| Name | wra-app |
| Root Directory | *(leave blank)* |
| Runtime | Node |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

4. Environment Variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = `your_long_random_secret`
   - `PORT` = `10000`
   - `SCANNER_URL` = `https://wra-scanner.onrender.com` ← URL from Service 1

5. Deploy → your app is live at `https://wra-app.onrender.com`

---

## API Reference

### Flask Scanner (port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze` | Analyze a URL |
| POST | `/lists/sync` | Sync blacklist/whitelist from Node |

### Node.js API (port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/scans/analyze` | Scan a URL |
| GET | `/api/scans/history` | Scan history |
| GET | `/api/scans/:id` | Get scan report |
| DELETE | `/api/scans/:id` | Delete scan |
| GET | `/api/admin/users` | List users (admin) |
| GET/POST/DELETE | `/api/admin/blacklist` | Manage blacklist |
| GET/POST/DELETE | `/api/admin/whitelist` | Manage whitelist |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Recharts, Lucide |
| Node Backend | Node.js, Express.js, JWT, bcryptjs |
| Python Backend | Python 3, Flask, Flask-CORS, Gunicorn |
| Database | JSON file store (zero setup) |
