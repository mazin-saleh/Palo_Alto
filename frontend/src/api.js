import { API_BASE } from './utils/constants';

export async function fetchIncidents(params = {}) {
  const url = new URL(`${API_BASE}/incidents`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      url.searchParams.set(k, v);
    }
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDigest() {
  const res = await fetch(`${API_BASE}/digest`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function resolveIncident(id) {
  const res = await fetch(`${API_BASE}/incidents/${id}/resolve`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchIncident(id) {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createIncident(data) {
  const res = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function patchIncident(id, data) {
  const res = await fetch(`${API_BASE}/incidents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteIncident(id) {
  const res = await fetch(`${API_BASE}/incidents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function bulkInject() {
  const res = await fetch(`${API_BASE}/incidents/bulk`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createFallbackIncident(data) {
  const res = await fetch(`${API_BASE}/incidents/demo-fallback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchModelConfig() {
  const res = await fetch(`${API_BASE}/config/model`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setModelConfig(model) {
  const res = await fetch(`${API_BASE}/config/model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function toggleOfflineMode() {
  const res = await fetch(`${API_BASE}/config/offline`, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function upgradeAllToAI() {
  const res = await fetch(`${API_BASE}/incidents/upgrade-to-ai`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Analytics ---

export async function fetchAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchZoneDetail(zone) {
  const res = await fetch(`${API_BASE}/analytics/zones/${encodeURIComponent(zone)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchResources(params = {}) {
  const url = new URL(`${API_BASE}/resources`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// --- Safe Circles ---

export async function createCircle(data) {
  const res = await fetch(`${API_BASE}/circles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCircles(userId) {
  const res = await fetch(`${API_BASE}/circles?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function broadcastStatus(circleId, data) {
  const res = await fetch(`${API_BASE}/circles/${circleId}/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCircleStatuses(circleId, userId) {
  const res = await fetch(`${API_BASE}/circles/${circleId}/statuses?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchEncryptedStatuses(circleId) {
  const res = await fetch(`${API_BASE}/circles/${circleId}/statuses/encrypted`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function seedCircles() {
  const res = await fetch(`${API_BASE}/circles/seed`, { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
