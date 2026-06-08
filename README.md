# ⚽ BetIQ — Sports Prediction Engine

AI-powered football predictions with live odds, H2H analysis, and team form stats.

## 🏗️ Project Structure

```
sports-predictor/
├── backend/          → Node.js/Express API (deploy to Railway)
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── matches.js
│   │   │   ├── odds.js
│   │   │   ├── predictions.js
│   │   │   └── analysis.js
│   │   └── services/
│   │       ├── apiFootball.js
│   │       ├── oddsApi.js
│   │       └── predictionEngine.js
│   ├── .env.example
│   └── railway.json
│
└── frontend/         → Next.js 14 App (deploy to Vercel)
    ├── src/app/
    │   ├── page.tsx
    │   ├── layout.tsx
    │   └── globals.css
    ├── src/lib/api.ts
    └── .env.example
```

---

## 🚀 STEP 1 — GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit: BetIQ Sports Predictor"
git remote add origin https://github.com/YOUR_USERNAME/sports-predictor.git
git push -u origin main
```

---

## 🚂 STEP 2 — Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your `sports-predictor` repo
3. Set **Root Directory** to `backend`
4. Add Environment Variables in Railway dashboard:

```
THE_ODDS_API_KEY=your_key_here
API_FOOTBALL_KEY=your_key_here
SPORTMONKS_API_TOKEN=your_token_here
FOOTBALL_DATA_API_KEY=your_key_here
STATS_API_KEY=your_key_here
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
```

5. Railway will auto-deploy. Copy your Railway URL (e.g. `https://sports-predictor-production.railway.app`)

---

## ▲ STEP 3 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select your `sports-predictor` repo
3. Set **Root Directory** to `frontend`
4. Add Environment Variable:

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

5. Deploy! Vercel gives you a URL like `https://sports-predictor.vercel.app`
6. **Important**: Go back to Railway and update `FRONTEND_URL` to your Vercel URL

---

## 🔑 API Keys Setup

| API | Where to get | Free tier |
|-----|-------------|-----------|
| API-Football | [api-sports.io](https://api-sports.io) | 100 req/day |
| The Odds API | [the-odds-api.com](https://the-odds-api.com) | 500 req/month |
| SportMonks | [sportmonks.com](https://sportmonks.com) | Free trial |
| Football-Data | [football-data.org](https://football-data.org) | Free tier |
| TheStatsAPI | [thestatsapi.com](https://thestatsapi.com) | Free tier |

---

## ⚽ Features

- 🔴 **Live Matches** — Real-time scores updated every 60 seconds
- 📅 **Today's Matches** — All upcoming fixtures
- 🤝 **H2H Analysis** — Last 10 head-to-head results with win% breakdown
- 📈 **Team Form** — Last 5 matches W/D/L with goals avg
- 🎯 **Predictions** — AI prediction with confidence score
- 💰 **Odds Analysis** — Implied probability from bookmakers
- ⚡ **BTTS & Over/Under** — Additional bet recommendations

---

## 🏃 Local Development

```bash
# Backend
cd backend
cp .env.example .env
# Fill in your API keys in .env
npm install
npm run dev   # Runs on port 3001

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev   # Runs on port 3000
```

Visit `http://localhost:3000`

---

## 🔧 Prediction Algorithm

The prediction engine uses a weighted scoring model:

| Factor | Weight | Source |
|--------|--------|--------|
| Recent Form (last 5) | 30% | API-Football |
| H2H History | 25% | API-Football |
| Home Advantage | 15% | Static factor |
| Market Odds | 30% | The Odds API |

Output: Win/Draw/Away probabilities + BTTS + Over/Under 2.5
