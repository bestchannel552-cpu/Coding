# YouTube Niche Research Lab

A lightweight app for finding fast-growing YouTube niches with:
- category-based discovery,
- channel finder with manual filters,
- keyword-based realtime trend scanning from YouTube search data.

## Local Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Auto Deploy (No manual redeploy needed)

I have added GitHub Actions based auto-deploy for Render.
After one-time setup, every push to branch `work` will auto deploy.

### One-time setup (5–10 min)
1. Push this repo to your GitHub account.
2. Create a **Render Web Service** connected to this repo.
3. In Render service settings, copy **Service ID**.
4. Create a Render API key from account settings.
5. In GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `RENDER_API_KEY`
   - `RENDER_SERVICE_ID`
6. Done. Now every push to `work` branch runs:
   - install
   - checks
   - deploy trigger

Workflow file: `.github/workflows/deploy-render.yml`

## Manual fallback deploy (if needed)

### Render/Railway
- Build command: `npm install`
- Start command: `npm start`
- Port: from `PORT` env (already supported)
- Health check path: `/health`

### Docker
```bash
docker build -t niche-research-tool .
docker run -d -p 3000:3000 --name niche-research niche-research-tool
```

## Important note
- Main aapke personal Render/GitHub account me direct login karke deploy start nahi kar sakta without your credentials.
- Lekin repo me auto-deploy pipeline fully configured hai; aap sirf secrets add karo, baqi deploy automatic ho jayega.
