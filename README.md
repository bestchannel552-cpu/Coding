# YouTube Niche Research Lab

A lightweight app for finding fast-growing YouTube niches with:
- category-based discovery,
- channel finder with manual filters,
- keyword-based realtime trend scanning from YouTube search data.

## Local Run

```bash
npm start
```

Open `http://localhost:3000`.

## Deploy Guide

### 1) Quick deploy on Railway / Render (recommended)
1. Push this repo to GitHub.
2. Create a new Web Service and connect your repo.
3. Use these settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Port:** `3000` (or platform default via `PORT` env)
4. Deploy.
5. Verify health check URL: `/health`.

This app reads `process.env.PORT`, so it works on most Node hosting platforms without changes.

### 2) VPS deploy (Ubuntu + PM2)
```bash
# on server
sudo apt update && sudo apt install -y nodejs npm git
npm install -g pm2

git clone <your-repo-url>
cd Coding
npm install
pm2 start server.js --name niche-research
pm2 save
pm2 startup
```

Optional Nginx reverse proxy to `localhost:3000` for domain + SSL.

### 3) Docker deploy
```bash
docker build -t niche-research-tool .
docker run -d -p 3000:3000 --name niche-research niche-research-tool
```

Then open `http://<server-ip>:3000`.

## Notes
- The app attempts live YouTube search parsing.
- If network/proxy blocks YouTube, it automatically switches to a fallback dataset so your workflow still runs.
