# Web Risk Analyzer

A website security assessment tool that scans for malicious URLs, SSL issues,
exposed ports, security headers, and common vulnerabilities.

---

## Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Step 1 — Backend
```bash
cd web-risk-analyzer/backend
npm install --legacy-peer-deps --no-audit --no-fund
node server.js
```
Backend runs at: **http://localhost:5000**

### Step 2 — Frontend
Open a second terminal:
```bash
cd web-risk-analyzer/frontend
npm install --legacy-peer-deps --no-audit --no-fund
npm run dev
```
Frontend runs at: **http://localhost:3000**

### Default Login
| Role  | Email         | Password |
|-------|---------------|----------|
| Admin | admin@wra.com | admin123 |

---

## Deploy to Render (Free Hosting)

### Step 1 — Push to GitHub

1. Create a new repo on [github.com](https://github.com/new)
2. Open a terminal in the `web-risk-analyzer` folder and run:

```bash
git init
git add .
git commit -m "Initial commit - Web Risk Analyzer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

### Step 2 — Create a Web Service on Render

1. Go to [render.com](https://render.com) and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select your repository
4. Fill in the settings:

| Field | Value |
|-------|-------|
| **Name** | web-risk-analyzer |
| **Region** | Choose closest to you |
| **Branch** | main |
| **Root Directory** | *(leave blank)* |
| **Runtime** | Node |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

---

### Step 3 — Add Environment Variables

In the Render dashboard, go to your service → **Environment** tab → Add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | `any_long_random_string_here` |
| `PORT` | `10000` |

> **Important:** Change `JWT_SECRET` to something long and random like:
> `x7k2mP9qR4nL8vW3jY6hT1cA5bE0dF`

---

### Step 4 — Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Install frontend dependencies
   - Build the React app (`npm run build`)
   - Install backend dependencies
   - Start the Express server
3. Wait 3–5 minutes for the first deploy to finish
4. Your app will be live at: `https://your-app-name.onrender.com`

---

### Step 5 — Open Your App

Visit the URL Render gives you (e.g. `https://web-risk-analyzer.onrender.com`)

Login with:
- Email: `admin@wra.com`
- Password: `admin123`

> **Note:** On Render's free tier, the service sleeps after 15 minutes of inactivity.
> First load after sleep takes ~30 seconds to wake up. This is normal.

---

## How It Works on Render

```
Render Server
├── npm run build  →  builds React into frontend/dist/
└── npm start      →  starts Express which:
                       ├── serves /api/* routes (backend)
                       └── serves frontend/dist/ (React app)
```

Everything runs as a **single service** — no separate frontend hosting needed.

---

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18, Vite, React Router, Recharts, Lucide |
| Backend  | Node.js, Express.js |
| Database | JSON file store (zero setup) |
| Auth     | JWT + bcryptjs |
| Hosting  | Render.com |
