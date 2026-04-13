import { getToken } from './authService';

const API = '/api';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function createProject(data: { title: string; description: string; location_address: string; urgency: string; quality_tier: string }) {
  const res = await fetch(`${API}/projects`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function getPresignedUrls(projectId: string, files: { filename: string; content_type: string; media_type: string }[]) {
  const res = await fetch(`${API}/projects/presign`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ project_id: projectId, files }) });
  return res.json();
}

export async function confirmMedia(projectId: string, media: { s3_key: string; media_type: string; file_size_bytes: number; mime_type: string }[]) {
  const res = await fetch(`${API}/projects/confirm-media`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ project_id: projectId, media }) });
  return res.json();
}

export async function getMyProjects() {
  const res = await fetch(`${API}/projects`, { headers: authHeaders() });
  return res.json();
}

export async function getProject(id: string) {
  const res = await fetch(`${API}/projects/${id}`, { headers: authHeaders() });
  return res.json();
}

export async function getProjectStatus(id: string) {
  const res = await fetch(`${API}/projects/${id}/status`, { headers: authHeaders() });
  return res.json();
}

export async function approveProject(id: string) {
  const res = await fetch(`${API}/projects/${id}/approve`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function retryProject(id: string) {
  const res = await fetch(`${API}/projects/${id}/retry`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function getAvailableProjects(category?: string) {
  const url = category ? `${API}/projects/available?category=${encodeURIComponent(category)}` : `${API}/projects/available`;
  const res = await fetch(url, { headers: authHeaders() });
  return res.json();
}

export async function submitBid(data: { project_id: string; bid_amount: number; estimated_days: number; proposal_notes: string; contractor_name?: string; contractor_category?: string }) {
  const res = await fetch(`${API}/bids`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function getMyBids() {
  const res = await fetch(`${API}/bids/my-bids`, { headers: authHeaders() });
  return res.json();
}

export async function getProjectBids(projectId: string) {
  const res = await fetch(`${API}/bids/project/${projectId}`, { headers: authHeaders() });
  return res.json();
}

export async function acceptBid(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/accept`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function rejectBid(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/reject`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function uploadFileToS3(presignedUrl: string, file: File): Promise<boolean> {
  try {
    const res = await fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return res.ok;
  } catch { return false; }
}
