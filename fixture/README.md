# JanPath Test Fixture Deployment Guide

The fixture is a self-contained, lightweight Express micro-service that renders static HTML pages with zero client-side JavaScript. This ensures that web crawlers, the TinyFish Fetch API, and the TinyFish exploration Agent can reliably read 100% of the content without rendering delays.

---

## 1. Running Locally

From the project root:
```bash
# Start the fixture on port 3002
node fixture/server.js
```
Environment variables:
- `FIXTURE_PORT`: Port to listen on (default `3002`)
- `FIXTURE_ADMIN_TOKEN`: Secret token protecting `POST /admin/toggle` (default `janpath-admin-secret`)

Visit `http://localhost:3002` in your browser.

---

## 2. Public Deployment (e.g. Render, Railway, Vercel, or Cloud Run)

You can deploy this directory independently or as a Node service on any PaaS:

### Deploying on Render / Railway
1. **Root Directory**: `fixture/` (or run from root with `node fixture/server.js`)
2. **Build Command**: (none or `npm install`)
3. **Start Command**: `node server.js`
4. **Environment Variables**:
   - `PORT`: `3002` (or PaaS assigned port)
   - `FIXTURE_ADMIN_TOKEN`: `your-secure-random-token`

### Testing the Live Deployment
```bash
# Check current variant
curl https://your-fixture-url.com/admin/status

# Toggle variant from defective to clean (or vice versa)
curl -X POST https://your-fixture-url.com/admin/toggle \
  -H "Authorization: Bearer your-secure-random-token" \
  -H "Content-Type: application/json"
```

Once deployed, set `FIXTURE_HOST=your-fixture-url.com` in `server/.env` so the backend `urlGuard` permits exploration and verification of the fixture site.
