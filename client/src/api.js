/**
 * client/src/api.js
 *
 * Client API adapter communicating with the Express backend.
 * Uses relative URL path (/api) to leverage the Vite dev server proxy or direct deployment.
 */

const API_BASE = '/api';

export async function createAudit({ startUrl, goal }) {
  const res = await fetch(`${API_BASE}/audits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startUrl, goal })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function getAudit(id) {
  const res = await fetch(`${API_BASE}/audits/${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function getEvents(id, after) {
  const url = after
    ? `${API_BASE}/audits/${encodeURIComponent(id)}/events?after=${encodeURIComponent(after)}`
    : `${API_BASE}/audits/${encodeURIComponent(id)}/events`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function listAudits(startUrl) {
  const url = startUrl
    ? `${API_BASE}/audits?startUrl=${encodeURIComponent(startUrl)}`
    : `${API_BASE}/audits`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data.audits || [];
}

export async function reaudit(id) {
  const res = await fetch(`${API_BASE}/audits/${encodeURIComponent(id)}/reaudit`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data;
}

export async function compareAudits(baseId, targetId) {
  const res = await fetch(
    `${API_BASE}/audits/compare?base=${encodeURIComponent(baseId)}&target=${encodeURIComponent(targetId)}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data;
}
