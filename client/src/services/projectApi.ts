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

// ── Draft Resume & Photo Upload ──

export async function getDraftProject(id: string) {
  const res = await fetch(`${API}/projects/${id}/draft`, { headers: authHeaders() });
  return res.json();
}

export async function updateDraftProject(id: string, data: { title?: string; description?: string; location_address?: string; urgency?: string; quality_tier?: string }) {
  const res = await fetch(`${API}/projects/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function deleteMedia(projectId: string, mediaId: string) {
  const res = await fetch(`${API}/projects/${projectId}/media/${mediaId}`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

// ── Task Customization ──

export async function updateTask(projectId: string, taskId: string, data: { title?: string; description?: string; homeowner_notes?: string; dimensions?: string; quantity?: number; unit?: string }) {
  const res = await fetch(`${API}/projects/${projectId}/tasks/${taskId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function setTaskPrice(projectId: string, taskId: string, ownerStartPrice: number) {
  const res = await fetch(`${API}/projects/${projectId}/tasks/${taskId}/price`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ owner_start_price: ownerStartPrice }) });
  return res.json();
}

export async function toggleTaskVisibility(projectId: string, taskId: string, isHidden: boolean) {
  const res = await fetch(`${API}/projects/${projectId}/tasks/${taskId}/visibility`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_hidden: isHidden }) });
  return res.json();
}

// ── Q&A System ──

export async function submitQuestion(projectId: string, question: string) {
  const res = await fetch(`${API}/bids/questions`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ project_id: projectId, question }) });
  return res.json();
}

export async function getProjectQuestions(projectId: string) {
  const res = await fetch(`${API}/bids/questions/project/${projectId}`, { headers: authHeaders() });
  return res.json();
}

export async function answerQuestion(questionId: string, answer: string) {
  const res = await fetch(`${API}/bids/questions/${questionId}/reply`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ answer }) });
  return res.json();
}

// ── Contractor Catalogs ──

export async function getCatalogs() {
  const res = await fetch(`${API}/catalogs`, { headers: authHeaders() });
  return res.json();
}

export async function createCatalog(data: { job_category: string; name: string }) {
  const res = await fetch(`${API}/catalogs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function getCatalogItems(catalogId: string) {
  const res = await fetch(`${API}/catalogs/${catalogId}/items`, { headers: authHeaders() });
  return res.json();
}

export async function addCatalogItem(catalogId: string, data: { name: string; brand?: string; model?: string; specifications?: string; image_url?: string; unit_price?: number }) {
  const res = await fetch(`${API}/catalogs/${catalogId}/items`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function updateCatalogItem(itemId: string, data: any) {
  const res = await fetch(`${API}/catalogs/items/${itemId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function deleteCatalogItem(itemId: string) {
  const res = await fetch(`${API}/catalogs/items/${itemId}`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

// ── Serving Areas ──

export async function updateServingAreas(data: { serving_cities?: string[]; serving_zipcodes?: string[] }) {
  const res = await fetch(`${API}/profile/serving-areas`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API}/profile/categories`, { headers: authHeaders() });
  return res.json();
}

export async function updateProfile(data: any) {
  const res = await fetch(`${API}/profile/update`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function getMyProfile() {
  const res = await fetch(`${API}/profile/me`, { headers: authHeaders() });
  return res.json();
}
