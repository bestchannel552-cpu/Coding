async function api(path) {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function itemTemplate(title, rows, url) {
  return `<div class="item"><strong>${title}</strong>${rows.map(r => `<div>${r}</div>`).join('')}<div><a href="${url}" target="_blank">Open</a></div></div>`;
}

async function loadCategories() {
  const { categories } = await api('/api/categories');
  const wrap = document.getElementById('categories');
  wrap.innerHTML = categories.map(c => `<button class="chip" data-category="${c}">${c}</button>`).join('');

  wrap.addEventListener('click', async (e) => {
    const category = e.target.getAttribute('data-category');
    if (!category) return;
    document.getElementById('pickedCategory').textContent = `Selected: ${category}`;

    const data = await api(`/api/category-insights?category=${encodeURIComponent(category)}`);
    document.getElementById('pickedCategory').textContent = `Selected: ${category} | Query used: ${data.keyword}${data.fallback ? ' (fallback data)' : ''}`;

    document.getElementById('categoryChannels').innerHTML = data.channels.map(c =>
      itemTemplate(c.name, [`Subs: ${c.subscribersText}`, `Videos: ${c.videoCountText}`], c.url)
    ).join('');

    document.getElementById('categoryVideos').innerHTML = data.videos.map(v =>
      itemTemplate(v.title, [`Channel: ${v.channel}`, `Views: ${v.viewsText}`, `Published: ${v.ago}`], v.url)
    ).join('');
  });
}

async function bindChannelFinder() {
  document.getElementById('findChannels').addEventListener('click', async () => {
    const keyword = document.getElementById('channelKeyword').value;
    const minSubs = document.getElementById('minSubs').value;
    const maxSubs = document.getElementById('maxSubs').value;
    const minVideos = document.getElementById('minVideos').value;
    const perf = document.getElementById('channelPerf').value;

    const data = await api(`/api/channel-finder?keyword=${encodeURIComponent(keyword)}&minSubs=${minSubs}&maxSubs=${maxSubs}&minVideos=${minVideos}&perf=${perf}`);
    const note = data.fallback ? '<p class="muted">Live YouTube blocked, showing fallback ideas.</p>' : '';
    document.getElementById('finderResult').innerHTML = note + (data.channels.length ? data.channels.map(c =>
      itemTemplate(c.name, [
        `Subs: ${c.subscribersText}`,
        `Videos: ${c.videoCountText}`,
        `Performance score: ${c.estimatedPerformance}`,
        `Potential: ${c.highPotential ? 'High' : 'Normal'}`
      ], c.url)
    ).join('') : '<p class="muted">No matching channels found.</p>');
  });
}

async function bindKeywordScanner() {
  document.getElementById('scanKeyword').addEventListener('click', async () => {
    const keyword = document.getElementById('keyword').value;
    const minViews = document.getElementById('minViews').value;
    const maxAgeMonths = document.getElementById('maxAgeMonths').value;
    const perf = document.getElementById('perf').value;

    const data = await api(`/api/keyword-research?keyword=${encodeURIComponent(keyword)}&minViews=${minViews}&maxAgeMonths=${maxAgeMonths}&perf=${perf}`);

    document.getElementById('keywordStats').innerHTML = [
      `Avg Views: ${data.marketStats.avgViews.toLocaleString()}`,
      `Result Pool: ${data.marketStats.totalResults}`,
      `High-opportunity videos: ${data.marketStats.opportunities}`,
      `${data.marketStats.fallbackSource ? 'Network blocked: using smart fallback dataset' : 'Live YouTube source active'}`
    ].map(s => `<div class="stat">${s}</div>`).join('');

    document.getElementById('keywordVideos').innerHTML = data.videos.map(v =>
      itemTemplate(v.title, [
        `Channel: ${v.channel}`,
        `Views: ${v.viewsText}`,
        `Age: ${v.ago}`,
        `Perf Ratio: ${v.performanceRatio}x`,
        `Opportunity: ${v.isOpportunity ? 'Yes' : 'No'}`
      ], v.url)
    ).join('');
  });
}

loadCategories();
bindChannelFinder();
bindKeywordScanner();
