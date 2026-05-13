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

export async function getProjectBidSummary(id: string) {
  const res = await fetch(`${API}/projects/${id}/bid-summary`, { headers: authHeaders() });
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

export async function submitBid(data: {
  project_id: string;
  estimated_days: number;
  proposal_notes: string;
  bid_amount?: number;
  contractor_name?: string;
  contractor_category?: string;
  task_breakdown?: { task_id: string; labor_cost: number; notes?: string }[];
}) {
  const res = await fetch(`${API}/bids`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function getBid(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}`, { headers: authHeaders() });
  return res.json();
}

export async function getBidWithBreakdown(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}`, { headers: authHeaders() });
  return res.json();
}

export async function updateBid(bidId: string, data: {
  estimated_days?: number;
  proposal_notes?: string;
  task_breakdown?: { task_id: string; labor_cost: number; notes?: string }[];
}) {
  const res = await fetch(`${API}/bids/${bidId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
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

export async function shortlistBid(bidId: string, rank: 1 | 2 | 3) {
  const res = await fetch(`${API}/bids/${bidId}/shortlist`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ rank }) });
  return res.json();
}

export async function clearShortlist(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/shortlist`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

export async function selectAndNotify(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/select-notify`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function patchBidStatus(bidId: string, data: { status: string; rejection_reason?: string }) {
  const res = await fetch(`${API}/bids/${bidId}/status`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function rejectBidWithReason(bidId: string, rejection_reason: string) {
  const res = await fetch(`${API}/bids/${bidId}/reject`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ rejection_reason }),
  });
  return res.json();
}

export async function presignBidAttachment(bidId: string, filename: string, content_type: string) {
  const res = await fetch(`${API}/bids/${bidId}/attachments/presign`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ filename, content_type }),
  });
  return res.json();
}

export async function finalizeBidAttachment(bidId: string, data: { file_name: string; s3_key: string; mime_type: string; size_bytes: number }) {
  const res = await fetch(`${API}/bids/${bidId}/attachments`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return res.json();
}

export async function listBidAttachments(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/attachments`, { headers: authHeaders() });
  return res.json();
}

export async function deleteBidAttachment(bidId: string, attachmentId: string) {
  const res = await fetch(`${API}/bids/${bidId}/attachments/${attachmentId}`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

export async function listBidMessages(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/messages`, { headers: authHeaders() });
  return res.json();
}

export async function postBidMessage(bidId: string, message: string) {
  const res = await fetch(`${API}/bids/${bidId}/messages`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ message }),
  });
  return res.json();
}

export async function markBidMessageRead(bidId: string, messageId: string) {
  const res = await fetch(`${API}/bids/${bidId}/messages/${messageId}/read`, { method: 'PATCH', headers: authHeaders() });
  return res.json();
}

export async function acceptOffer(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/accept-offer`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function getContract(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/contract`, { headers: authHeaders() });
  return res.json();
}

export async function signContract(bidId: string, typed_name: string) {
  const res = await fetch(`${API}/bids/${bidId}/contract/sign`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ typed_name }),
  });
  return res.json();
}

export async function proposeSchedule(bidId: string, proposed_start_date: string, proposed_end_date: string) {
  const res = await fetch(`${API}/bids/${bidId}/contract/schedule`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ proposed_start_date, proposed_end_date }),
  });
  return res.json();
}

export async function approveSchedule(bidId: string, owner_signature?: string) {
  const res = await fetch(`${API}/bids/${bidId}/contract/schedule/approve`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ owner_signature }),
  });
  return res.json();
}

export async function rejectSchedule(bidId: string, response_notes: string) {
  const res = await fetch(`${API}/bids/${bidId}/contract/schedule/reject`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ response_notes }),
  });
  return res.json();
}

export async function createDepositIntent(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/deposit/intent`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function listBidReceipts(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/receipts`, { headers: authHeaders() });
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

export async function setOwnerSuppliedMaterials(projectId: string, taskId: string, ownerSupplied: boolean) {
  const res = await fetch(`${API}/projects/${projectId}/tasks/${taskId}/owner-supplied-materials`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ owner_supplied: ownerSupplied }) });
  return res.json();
}

export async function submitFeedback(data: { message: string; context?: string; project_id?: string }) {
  const res = await fetch(`${API}/feedback`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
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

export async function presignCatalogItemImage(itemId: string, filename: string, content_type: string) {
  const res = await fetch(`${API}/catalogs/items/${itemId}/image/presign`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ filename, content_type }),
  });
  return res.json();
}

// ── Serving Areas ──

export async function updateServingAreas(data: { serving_cities?: string[]; serving_zipcodes?: string[]; serving_location_ids?: string[] }) {
  const res = await fetch(`${API}/profile/serving-areas`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function searchLocations(q: string, level?: string, limit = 20) {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  if (level) qs.set('level', level);
  const res = await fetch(`${API}/locations/search?${qs}`, { headers: authHeaders() });
  return res.json();
}

export async function getLocationsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return { success: true, data: { locations: [] } };
  const res = await fetch(`${API}/locations/by-ids?ids=${encodeURIComponent(ids.join(','))}`, { headers: authHeaders() });
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

export async function getBillingProfile() {
  const res = await fetch(`${API}/profile/billing`, { headers: authHeaders() });
  return res.json();
}

export async function updateBillingProfile(data: {
  legal_company_name?: string;
  ein?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_phone?: string;
  signature_s3_key?: string;
}) {
  const res = await fetch(`${API}/profile/billing`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  return res.json();
}

export async function presignSignatureUpload(filename: string, content_type: string) {
  const res = await fetch(`${API}/profile/billing/signature/presign`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ filename, content_type }),
  });
  return res.json();
}

export async function presignPaymentProof(bidId: string, filename: string, content_type: string) {
  const res = await fetch(`${API}/bids/${bidId}/payment-proof/presign`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ filename, content_type }),
  });
  return res.json();
}

// ── Additional Work Orders ──

export async function listAdditionalWork(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/additional-work`, { headers: authHeaders() });
  return res.json();
}

export async function submitAdditionalWork(bidId: string, data: {
  title: string;
  description?: string;
  amount_cents: number;
  photo_evidence_keys?: string[];
}) {
  const res = await fetch(`${API}/bids/${bidId}/additional-work`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return res.json();
}

export async function acceptAdditionalWork(bidId: string, awoId: string, data: {
  owner_signature_typed_name: string;
  owner_response_notes?: string;
}) {
  const res = await fetch(`${API}/bids/${bidId}/additional-work/${awoId}/accept`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return res.json();
}

export async function rejectAdditionalWork(bidId: string, awoId: string, data: { owner_response_notes: string }) {
  const res = await fetch(`${API}/bids/${bidId}/additional-work/${awoId}/reject`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return res.json();
}

export async function confirmPayment(bidId: string, data: {
  payment_method: string;
  transaction_reference: string;
  transaction_date: string;
  transaction_amount_cents: number;
  proof_s3_key: string;
  contractor_notes?: string;
}) {
  const res = await fetch(`${API}/bids/${bidId}/payment-confirmed`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
  });
  return res.json();
}

// ── Visit tracking (post-deposit) ──

export async function getVisitStatus(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/visit-status`, { headers: authHeaders() });
  return res.json();
}

export async function postVisitConfirmation(bidId: string, visited: boolean) {
  const res = await fetch(`${API}/bids/${bidId}/visit-confirmation`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ visited }),
  });
  return res.json();
}

export async function postVisitReminder(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/visit-reminder`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function abandonNoShow(bidId: string, note?: string) {
  const res = await fetch(`${API}/bids/${bidId}/abandon-no-show`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ note: note || null }),
  });
  return res.json();
}

// ── Contractor ratings ──

export async function requestContractorRating(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/request-rating`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function submitContractorRating(bidId: string, rating: number, review_text?: string) {
  const res = await fetch(`${API}/bids/${bidId}/rating`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ rating, review_text: review_text || null }),
  });
  return res.json();
}

export async function getRatingForBid(bidId: string) {
  const res = await fetch(`${API}/bids/${bidId}/rating`, { headers: authHeaders() });
  return res.json();
}

export async function getContractorReputation(contractorId: string) {
  const res = await fetch(`${API}/bids/contractor/${contractorId}/reputation`, { headers: authHeaders() });
  return res.json();
}
