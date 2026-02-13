const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;

if (!apiKey || !serviceId) {
  console.error('Missing RENDER_API_KEY or RENDER_SERVICE_ID');
  process.exit(1);
}

const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

if (!res.ok) {
  const body = await res.text();
  console.error('Deploy trigger failed:', res.status, body);
  process.exit(1);
}

const payload = await res.json();
console.log('Deploy triggered:', payload.id || 'ok');
