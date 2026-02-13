const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const CATEGORIES = {
  "AI & Automation": ["ai tools", "chatgpt tutorials", "automation business"],
  "Finance & Side Hustles": ["side hustle ideas", "make money online", "personal finance tips"],
  "Health & Fitness": ["home workout", "fat loss tips", "healthy meal prep"],
  "Tech Reviews": ["best gadgets", "smartphone comparison", "tech unboxing"],
  "Gaming": ["gaming highlights", "esports", "game walkthrough"],
  "Education": ["study techniques", "exam preparation", "learn coding fast"],
  "Shorts Growth": ["viral shorts", "youtube shorts strategy", "short video ideas"]
};

function parseCount(text = '') {
  const clean = text.replace(/,/g, '').trim();
  const match = clean.match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  const mult = suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : suffix === 'B' ? 1e9 : 1;
  return Math.round(num * mult);
}

function ageToMonths(ago = '') {
  const text = ago.toLowerCase();
  const value = parseInt(text.match(/\d+/)?.[0] || '0', 10);
  if (text.includes('year')) return value * 12;
  if (text.includes('month')) return value;
  if (text.includes('week')) return Math.max(1, Math.round(value / 4));
  if (text.includes('day') || text.includes('hour') || text.includes('minute')) return 0;
  return 0;
}

function extractInitialData(html) {
  const patterns = [
    /var ytInitialData = (\{.*?\});<\/script>/s,
    /window\["ytInitialData"\] = (\{.*?\});/s,
    /ytInitialData\s*=\s*(\{.*?\});/s
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) {
      try { return JSON.parse(m[1]); } catch {}
    }
  }
  throw new Error('Could not parse YouTube data');
}

function findRenderers(obj, key, acc = []) {
  if (!obj || typeof obj !== 'object') return acc;
  if (Array.isArray(obj)) {
    for (const item of obj) findRenderers(item, key, acc);
    return acc;
  }
  if (obj[key]) acc.push(obj[key]);
  for (const k of Object.keys(obj)) findRenderers(obj[k], key, acc);
  return acc;
}

async function youtubeSearch(query) {
  let data;
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!res.ok) throw new Error(`YouTube request failed (${res.status})`);
    const html = await res.text();
    data = extractInitialData(html);
  } catch {
    return generateFallbackData(query);
  }

  const videoRenderers = findRenderers(data, 'videoRenderer');
  const channelRenderers = findRenderers(data, 'channelRenderer');

  const videos = videoRenderers.map((v) => {
    const title = v.title?.runs?.map(r => r.text).join('') || 'Unknown';
    const viewsText = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '0 views';
    const views = parseCount(viewsText);
    const ago = v.publishedTimeText?.simpleText || 'recent';
    const channel = v.ownerText?.runs?.[0]?.text || 'Unknown channel';
    const channelId = v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
    return {
      id: v.videoId,
      title,
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
      channel,
      channelId,
      views,
      viewsText,
      ago,
      thumbnail: v.thumbnail?.thumbnails?.at(-1)?.url || ''
    };
  });

  const channels = channelRenderers.map((c) => {
    const subsText = c.subscriberCountText?.simpleText || '0 subscribers';
    const videosText = c.videoCountText?.runs?.map(r => r.text).join('') || c.videoCountText?.simpleText || '0 videos';
    return {
      channelId: c.channelId,
      name: c.title?.simpleText || 'Unknown',
      url: `https://www.youtube.com/channel/${c.channelId}`,
      subscribersText: subsText,
      subscribers: parseCount(subsText),
      videoCountText: videosText,
      videoCount: parseCount(videosText),
      description: c.descriptionSnippet?.runs?.map(r => r.text).join('') || '',
      thumbnail: c.thumbnail?.thumbnails?.at(-1)?.url || ''
    };
  });

  return { videos, channels, fallback: false };
}


function generateFallbackData(query) {
  const words = query.split(/\s+/).filter(Boolean);
  const seedWord = words[0] || 'topic';
  const channels = Array.from({ length: 12 }, (_, i) => ({
    channelId: `mock-${seedWord}-${i+1}`,
    name: `${seedWord.toUpperCase()} Growth Hub ${i + 1}`,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(seedWord + ' channel')}`,
    subscribersText: `${(i + 2) * 25}K subscribers`,
    subscribers: (i + 2) * 25000,
    videoCountText: `${(i + 3) * 20} videos`,
    videoCount: (i + 3) * 20,
    description: `Fallback data generated for ${query}`,
    thumbnail: ''
  }));

  const videos = Array.from({ length: 20 }, (_, i) => ({
    id: `mock-video-${i + 1}`,
    title: `${query} trend idea ${i + 1}`,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    channel: channels[i % channels.length].name,
    channelId: channels[i % channels.length].channelId,
    views: (i + 3) * 15000,
    viewsText: `${(i + 3) * 15}K views`,
    ago: `${(i % 8) + 1} months ago`,
    thumbnail: ''
  }));

  return { videos, channels, fallback: true };
}

function calculateOpportunity(video, avgViews, perfThreshold) {
  const ratio = avgViews > 0 ? video.views / avgViews : 0;
  return {
    ...video,
    performanceRatio: Number(ratio.toFixed(2)),
    isOpportunity: ratio >= perfThreshold
  };
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    const typeMap = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8'
    };
    res.writeHead(200, { 'Content-Type': typeMap[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'youtube-niche-research-lab' });
  }

  if (u.pathname === '/api/categories') {
    return sendJson(res, 200, { categories: Object.keys(CATEGORIES) });
  }

  if (u.pathname === '/api/category-insights') {
    try {
      const category = u.searchParams.get('category') || '';
      const keywords = CATEGORIES[category];
      if (!keywords) return sendJson(res, 400, { error: 'Invalid category' });

      const keyword = keywords[Math.floor(Math.random() * keywords.length)];
      const { videos, channels, fallback } = await youtubeSearch(keyword);
      return sendJson(res, 200, { category, keyword, fallback, videos: videos.slice(0, 12), channels: channels.slice(0, 12) });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (u.pathname === '/api/keyword-research') {
    try {
      const keyword = u.searchParams.get('keyword') || '';
      if (!keyword.trim()) return sendJson(res, 400, { error: 'Keyword required' });

      const minViews = parseInt(u.searchParams.get('minViews') || '0', 10);
      const maxAgeMonths = parseInt(u.searchParams.get('maxAgeMonths') || '999', 10);
      const perfThreshold = parseFloat(u.searchParams.get('perf') || '1.1');

      const { videos, channels, fallback } = await youtubeSearch(keyword);
      const recentFiltered = videos.filter(v => v.views >= minViews && ageToMonths(v.ago) <= maxAgeMonths);
      const avgViews = recentFiltered.length ? recentFiltered.reduce((sum, v) => sum + v.views, 0) / recentFiltered.length : 0;
      const scoredVideos = recentFiltered.map(v => calculateOpportunity(v, avgViews, perfThreshold));

      sendJson(res, 200, {
        keyword,
        marketStats: {
          fallbackSource: fallback,
          avgViews: Math.round(avgViews),
          totalResults: videos.length,
          opportunities: scoredVideos.filter(v => v.isOpportunity).length
        },
        videos: scoredVideos.slice(0, 20),
        channels: channels.slice(0, 20)
      });
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  if (u.pathname === '/api/channel-finder') {
    try {
      const keyword = u.searchParams.get('keyword') || '';
      const minSubs = parseInt(u.searchParams.get('minSubs') || '0', 10);
      const maxSubs = parseInt(u.searchParams.get('maxSubs') || '999999999999', 10);
      const minVideos = parseInt(u.searchParams.get('minVideos') || '0', 10);
      const perfThreshold = parseFloat(u.searchParams.get('perf') || '1.1');

      if (!keyword.trim()) return sendJson(res, 400, { error: 'Keyword required' });
      const { channels, videos, fallback } = await youtubeSearch(keyword);

      const channelViews = {};
      for (const v of videos) {
        if (!channelViews[v.channel]) channelViews[v.channel] = [];
        channelViews[v.channel].push(v.views);
      }

      const filtered = channels
        .filter(c => c.subscribers >= minSubs && c.subscribers <= maxSubs && c.videoCount >= minVideos)
        .map(c => {
          const samples = channelViews[c.name] || [];
          const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
          const potential = c.subscribers ? avg / c.subscribers : 0;
          return {
            ...c,
            estimatedPerformance: Number((potential * 100).toFixed(2)),
            highPotential: potential >= (perfThreshold / 100)
          };
        })
        .sort((a, b) => b.estimatedPerformance - a.estimatedPerformance);

      sendJson(res, 200, { keyword, fallback, channels: filtered.slice(0, 20) });
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  serveStatic(req, res, u.pathname);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
