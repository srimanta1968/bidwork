import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { bidService } from '../services/bidService';
import { questionModerationService } from '../services/questionModerationService';
import { profileService } from '../services/profileService';
import { projectDb, biddingDb } from '../services/domainDb';
import { s3Service } from '../services/s3Service';
import { redactBidForViewer, redactContractorForOwner } from '../services/redactors';

const PAYMENT_PROOF_MIME_ALLOW = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const PAYMENT_AMOUNT_TOLERANCE_CENTS = 50; // ±$0.50

export async function submitBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    if (req.user.role === 'homeowner') { res.status(403).json({ success: false, error: 'Homeowners cannot submit bids' }); return; }

    const { project_id, bid_amount, estimated_days, proposal_notes, contractor_name, contractor_category, task_breakdown } = req.body;
    if (!project_id || !estimated_days) {
      res.status(400).json({ success: false, error: 'project_id and estimated_days are required' }); return;
    }
    const hasBreakdown = Array.isArray(task_breakdown) && task_breakdown.length > 0;
    if (!hasBreakdown && (bid_amount === undefined || bid_amount === null)) {
      res.status(400).json({ success: false, error: 'Either task_breakdown or bid_amount is required' }); return;
    }

    const bid = await bidService.submitBid(project_id, req.user.userId, {
      bid_amount, estimated_days, proposal_notes, contractor_name, contractor_category, task_breakdown,
    });

    // Add optional material list — must run after breakdown insert so subtotal recompute lands
    const { material_list } = req.body;
    let materials = null;
    if (material_list?.length > 0 && bid) {
      materials = await bidService.addBidMaterials(bid.id, material_list);
      if (hasBreakdown) await bidService.recomputeBidAmountFromBreakdown(bid.id);
    }

    const full = bid ? await bidService.getBidWithBreakdown(bid.id) : bid;
    res.status(201).json({ success: true, data: { bid: full, materials } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

export async function getBidById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const bid = await bidService.getBidWithBreakdown(req.params.id);
    if (!bid) { res.status(404).json({ success: false, error: 'Bid not found' }); return; }
    res.status(200).json({ success: true, data: { bid } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    if (req.user.role === 'homeowner') { res.status(403).json({ success: false, error: 'Homeowners cannot edit bids' }); return; }

    const { estimated_days, proposal_notes, task_breakdown } = req.body;
    const bid = await bidService.updateBid(req.params.id, req.user.userId, { estimated_days, proposal_notes, task_breakdown });
    res.status(200).json({ success: true, data: { bid } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

export async function getProjectBids(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const rows = await bidService.getBidsForProject(req.params.projectId);
    // Redact each bid row defensively. Contractor profile lookups happen on demand;
    // we strip any joined PII columns here so the bid list never leaks email/phone.
    const bids = rows.map((b: any) => redactBidForViewer({
      ...b,
      // Provide a public contractor card if the bid row carries any joined data.
      contractor: redactContractorForOwner({
        id: b.contractor_id,
        business_name: b.contractor_name,
        category: b.contractor_category,
        abandonment_flag_count: b.abandonment_flag_count,
        last_abandoned_at: b.last_abandoned_at,
      }, { bidStatus: b.status, workflowState: b.selection_workflow_state }),
    }));
    res.status(200).json({ success: true, data: { bids } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getMyBids(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const rows = await bidService.getMyBids(req.user.userId);
    const bids = rows.map((b: any) => redactBidForViewer(b));
    res.status(200).json({ success: true, data: { bids } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function acceptBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const bid = await bidService.acceptBid(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { bid, message: 'Bid accepted. Contractor assigned.' } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

export async function rejectBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { rejection_reason } = req.body || {};
    await bidService.rejectBid(req.params.id, req.user.userId, rejection_reason);
    res.status(200).json({ success: true, data: { message: 'Bid rejected.' } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

/**
 * PATCH /api/bids/:id/status — homeowner status dropdown.
 * Body: {status, rejection_reason?}. rejection_reason required when status='rejected'.
 */
export async function patchBidStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { status, rejection_reason } = req.body || {};
    if (!status) { res.status(400).json({ success: false, error: 'status is required' }); return; }
    const bid = await bidService.updateBidStatus(req.params.id, req.user.userId, status, rejection_reason);
    res.status(200).json({ success: true, data: { bid } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function submitQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { project_id, question } = req.body;
    if (!project_id || !question?.trim()) {
      res.status(400).json({ success: false, error: 'project_id and question are required' }); return;
    }
    const result = await questionModerationService.submitQuestion(project_id, req.user.userId, question);
    res.status(201).json({ success: true, data: { question: result } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getProjectQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const questions = await questionModerationService.getProjectQuestions(req.params.projectId);
    res.status(200).json({ success: true, data: { questions } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * POST /api/bids/:id/deposit/intent — homeowner creates a Stripe payment intent
 * for the residual deposit after credit application. Gated on schedule_approved.
 */
export async function createDepositIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    // Schedule must be approved before the homeowner can pay the deposit.
    const sched = await biddingDb.queryOne<{ schedule_status: string }>(
      `SELECT schedule_status FROM contracts WHERE bid_id = $1`, [req.params.id]
    );
    if (!sched || sched.schedule_status !== 'approved') {
      res.status(412).json({ success: false, error: 'Schedule must be approved before paying the deposit', data: { schedule_status: sched?.schedule_status || 'not_proposed' } });
      return;
    }
    const { depositService } = await import('../services/depositService');
    const out = await depositService.createDepositIntent(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: out });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:id/contract/schedule — contractor proposes start/end dates.
 * PATCH /api/bids/:id/contract/schedule/approve — homeowner approves.
 * PATCH /api/bids/:id/contract/schedule/reject  — homeowner rejects with notes.
 */
export async function proposeSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { proposed_start_date, proposed_end_date } = req.body || {};
    if (!proposed_start_date || !proposed_end_date) {
      res.status(400).json({ success: false, error: 'proposed_start_date and proposed_end_date are required' }); return;
    }
    const contract = await bidService.proposeSchedule(req.params.id, req.user.userId, proposed_start_date, proposed_end_date);
    res.status(200).json({ success: true, data: { contract } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function approveSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { owner_signature } = req.body || {};
    const contract = await bidService.approveSchedule(req.params.id, req.user.userId, owner_signature);
    res.status(200).json({ success: true, data: { contract } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function rejectSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { response_notes } = req.body || {};
    if (!response_notes) { res.status(400).json({ success: false, error: 'response_notes is required' }); return; }
    const contract = await bidService.rejectSchedule(req.params.id, req.user.userId, response_notes);
    res.status(200).json({ success: true, data: { contract } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/bids/:id/receipts — owner-only; returns both BidWork service-fee
 * receipt (if issued) and the contractor's final payment receipt (if issued).
 */
export async function listBidReceipts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const v = await bidService.isBidVisibleTo(req.params.id, req.user.userId);
    if (!v.allowed) { res.status(403).json({ success: false, error: 'Not authorized' }); return; }
    const sf = await biddingDb.queryOne<any>('SELECT * FROM service_fee_receipts WHERE bid_id = $1', [req.params.id]);
    const cp = await biddingDb.queryOne<any>('SELECT * FROM contractor_payment_receipts WHERE bid_id = $1', [req.params.id]);
    const enrich = async (r: any) => r ? ({ ...r, download_url: r.receipt_pdf_s3_key ? await s3Service.getPresignedDownloadUrl(r.receipt_pdf_s3_key) : null }) : null;
    res.status(200).json({ success: true, data: { service_fee: await enrich(sf), contractor_payment: await enrich(cp) } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * POST /api/bids/:id/accept-offer — contractor accepts the homeowner's offer.
 * Generates the contract and locks the project from new bids.
 */
export async function acceptOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const result = await bidService.acceptOffer(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { contract: result } });
  } catch (error: any) {
    const code = error.message?.includes('Not your bid') || error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/bids/:id/contract — owner + bid contractor only.
 * Returns metadata + a presigned download URL for the current draft.
 */
export async function getContract(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const contract = await bidService.getContractForBid(req.params.id, req.user.userId);
    if (!contract) { res.status(404).json({ success: false, error: 'No contract for this bid yet' }); return; }
    const draft_download_url = contract.draft_pdf_s3_key ? await s3Service.getPresignedDownloadUrl(contract.draft_pdf_s3_key) : null;
    const signed_download_url = contract.signed_pdf_s3_key ? await s3Service.getPresignedDownloadUrl(contract.signed_pdf_s3_key) : null;
    // download_url kept for backwards compatibility — points to signed if available, else draft.
    const download_url = signed_download_url || draft_download_url;
    res.status(200).json({ success: true, data: { contract: { ...contract, download_url, draft_download_url, signed_download_url } } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:id/contract/sign body {typed_name}
 */
export async function signContract(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { typed_name } = req.body || {};
    if (!typed_name) { res.status(400).json({ success: false, error: 'typed_name is required' }); return; }
    const contract = await bidService.signContract(
      req.params.id,
      { userId: req.user.userId, ipAddress: req.ip || (req.socket as any)?.remoteAddress, userAgent: req.get('user-agent') },
      typed_name
    );
    res.status(200).json({ success: true, data: { contract } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:id/messages — owner or contractor posts to the private 1-on-1 thread.
 */
export async function postBidMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { message } = req.body || {};
    if (!message?.trim()) { res.status(400).json({ success: false, error: 'message is required' }); return; }
    const v = await bidService.isBidVisibleTo(req.params.id, req.user.userId);
    if (!v.allowed) { res.status(403).json({ success: false, error: 'Not authorized' }); return; }
    const role: 'homeowner' | 'contractor' = v.isOwner ? 'homeowner' : 'contractor';
    const m = await bidService.postBidMessage(req.params.id, { userId: req.user.userId, role }, message);
    res.status(201).json({ success: true, data: { message: m } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/bids/:id/messages — returns the thread (owner + that bid's contractor only).
 */
export async function listBidMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const messages = await bidService.listBidMessages(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { messages } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/bids/:id/messages/:messageId/read — recipient marks a message as read.
 */
export async function markBidMessageRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const m = await bidService.markBidMessageRead(req.params.id, req.params.messageId, req.user.userId);
    res.status(200).json({ success: true, data: { message: m } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:id/attachments/presign
 */
export async function presignBidAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { filename, content_type } = req.body;
    if (!filename || !content_type) { res.status(400).json({ success: false, error: 'filename and content_type required' }); return; }
    const bid = await biddingDb.queryOne<{ id: string; contractor_id: string }>('SELECT id, contractor_id FROM bids WHERE id = $1', [req.params.id]);
    if (!bid) { res.status(404).json({ success: false, error: 'Bid not found' }); return; }
    if (bid.contractor_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your bid' }); return; }
    const s3_key = s3Service.generateBidAttachmentKey(bid.id, filename);
    const { url, expiresIn } = await s3Service.getPresignedUploadUrl(s3_key, content_type);
    res.status(200).json({ success: true, data: { s3_key, upload_url: url, expires_in: expiresIn } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * POST /api/bids/:id/attachments — record metadata after the client uploads to S3.
 */
export async function finalizeBidAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { file_name, s3_key, mime_type, size_bytes } = req.body;
    if (!file_name || !s3_key || !mime_type || !size_bytes) {
      res.status(400).json({ success: false, error: 'file_name, s3_key, mime_type, size_bytes required' }); return;
    }
    const att = await bidService.finalizeBidAttachment(req.params.id, req.user.userId, {
      file_name, s3_key, mime_type, size_bytes: Number(size_bytes),
    });
    res.status(201).json({ success: true, data: { attachment: att } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

/**
 * GET /api/bids/:id/attachments — visible to bid contractor + project homeowner.
 */
export async function listBidAttachments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const items = await bidService.listBidAttachments(req.params.id, req.user.userId);
    const withUrls = await Promise.all(items.map(async (a: any) => ({
      ...a, download_url: await s3Service.getPresignedDownloadUrl(a.s3_key),
    })));
    res.status(200).json({ success: true, data: { attachments: withUrls } });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/bids/:id/attachments/:attachmentId — uploader only.
 */
export async function deleteBidAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const result = await bidService.deleteBidAttachment(req.params.id, req.params.attachmentId, req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 :
                 error.message?.includes('not found') ? 404 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:id/shortlist  body {rank: 1|2|3}
 * Homeowner shortlists a bid into one of the three rank slots.
 */
export async function shortlistBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const rank = Number(req.body?.rank);
    if (!Number.isInteger(rank) || rank < 1 || rank > 3) {
      res.status(400).json({ success: false, error: 'rank must be 1, 2, or 3' }); return;
    }
    const bid = await bidService.setShortlistRank(req.params.id, req.user.userId, rank);
    res.status(200).json({ success: true, data: { bid } });
  } catch (error: any) {
    const status = error.message?.includes('Not authorized') ? 403 :
                   error.message?.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/bids/:id/shortlist — clears the rank (drops back to pending).
 */
export async function clearShortlist(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const bid = await bidService.clearShortlistRank(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { bid } });
  } catch (error: any) {
    const status = error.message?.includes('Not authorized') ? 403 :
                   error.message?.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:id/select-notify
 * Promote a shortlisted bid to approved_by_owner — sends offer email to contractor
 * and starts the 72-working-hour acceptance window.
 */
export async function selectAndNotify(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const bid = await bidService.selectAndNotify(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: { bid } });
  } catch (error: any) {
    const status = error.message?.includes('Not authorized') ? 403 :
                   error.message?.includes('not found') ? 404 :
                   error.message?.includes('already in the approval flow') ? 409 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:bidId/additional-work
 * Contractor records work outside the original bid scope. Owner must accept before
 * it counts as part of the engagement; recording-only — no fee.
 */
export async function submitAdditionalWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { title, description, amount_cents, photo_evidence_keys } = req.body;
    if (!title || amount_cents === undefined || amount_cents === null) {
      res.status(400).json({ success: false, error: 'title and amount_cents are required' }); return;
    }
    const item = await bidService.submitAdditionalWork(req.params.bidId, req.user.userId, {
      title, description, amount_cents: Number(amount_cents), photo_evidence_keys,
    });
    res.status(201).json({ success: true, data: { additional_work: item } });
  } catch (error: any) {
    const status = error.message?.includes('Not your bid') || error.message?.includes('Not authorized') ? 403 :
                   error.message?.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:bidId/additional-work/:awoId/accept
 */
export async function acceptAdditionalWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { owner_signature_typed_name, owner_response_notes } = req.body;
    if (!owner_signature_typed_name) {
      res.status(400).json({ success: false, error: 'owner_signature_typed_name is required' }); return;
    }
    const item = await bidService.acceptAdditionalWork(
      req.params.bidId, req.params.awoId, req.user.userId, owner_signature_typed_name, owner_response_notes
    );
    res.status(200).json({ success: true, data: { additional_work: item } });
  } catch (error: any) {
    const status = error.message?.includes('Not authorized') ? 403 :
                   error.message?.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:bidId/additional-work/:awoId/reject
 */
export async function rejectAdditionalWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { owner_response_notes } = req.body;
    if (!owner_response_notes) {
      res.status(400).json({ success: false, error: 'owner_response_notes is required when rejecting' }); return;
    }
    const item = await bidService.rejectAdditionalWork(
      req.params.bidId, req.params.awoId, req.user.userId, owner_response_notes
    );
    res.status(200).json({ success: true, data: { additional_work: item } });
  } catch (error: any) {
    const status = error.message?.includes('Not authorized') ? 403 :
                   error.message?.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/bids/:bidId/additional-work — visible to bid contractor and project homeowner only.
 */
export async function listAdditionalWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const items = await bidService.listAdditionalWork(req.params.bidId, req.user.userId);
    res.status(200).json({ success: true, data: { items } });
  } catch (error: any) {
    const status = error.message?.includes('Not authorized') ? 403 :
                   error.message?.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/bids/:id/payment-proof/presign
 * Returns an S3 PUT URL for the contractor to upload their transaction proof.
 */
export async function presignPaymentProof(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { filename, content_type } = req.body;
    if (!filename || !content_type) { res.status(400).json({ success: false, error: 'filename and content_type required' }); return; }
    if (!PAYMENT_PROOF_MIME_ALLOW.includes(content_type)) {
      res.status(400).json({ success: false, error: 'Proof must be PDF, PNG, or JPEG' }); return;
    }

    const bid = await biddingDb.queryOne<{ id: string; contractor_id: string }>(
      'SELECT id, contractor_id FROM bids WHERE id = $1', [req.params.id]
    );
    if (!bid) { res.status(404).json({ success: false, error: 'Bid not found' }); return; }
    if (bid.contractor_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your bid' }); return; }

    const s3_key = s3Service.generatePaymentProofKey(bid.id, filename);
    const { url, expiresIn } = await s3Service.getPresignedUploadUrl(s3_key, content_type);
    res.status(200).json({ success: true, data: { s3_key, upload_url: url, expires_in: expiresIn } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * POST /api/bids/:id/payment-confirmed
 * Contractor submits the transaction record after receiving payment outside BidWork.
 * Stores the proof, blocks if billing profile is incomplete, validates amount matches
 * the bid grand total within tolerance, and transitions the project to completed.
 */
export async function confirmPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }

    const { payment_method, transaction_reference, transaction_date, transaction_amount_cents, proof_s3_key, contractor_notes } = req.body;
    if (!payment_method || !transaction_reference || !transaction_date || !transaction_amount_cents || !proof_s3_key) {
      res.status(400).json({ success: false, error: 'payment_method, transaction_reference, transaction_date, transaction_amount_cents, and proof_s3_key are required' });
      return;
    }

    const bid = await biddingDb.queryOne<{ id: string; project_id: string; contractor_id: string; status: string }>(
      'SELECT id, project_id, contractor_id, status FROM bids WHERE id = $1', [req.params.id]
    );
    if (!bid) { res.status(404).json({ success: false, error: 'Bid not found' }); return; }
    if (bid.contractor_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your bid' }); return; }

    // Billing profile must be complete before a contractor-issued receipt can be produced
    const billing = await profileService.getBillingProfile(req.user.userId);
    if (!billing || !billing.billing_profile_complete) {
      res.status(412).json({
        success: false,
        error: 'Billing profile incomplete. Complete your billing & tax information before marking payment received.',
        data: { complete_profile_url: '/profile/billing' },
      });
      return;
    }

    // Validate transaction amount matches bid grand total within tolerance
    const grandTotalCents = await bidService.getBidGrandTotalCents(bid.id);
    if (Math.abs(grandTotalCents - Number(transaction_amount_cents)) > PAYMENT_AMOUNT_TOLERANCE_CENTS) {
      res.status(400).json({
        success: false,
        error: `Transaction amount does not match bid total. Bid grand total: $${(grandTotalCents / 100).toFixed(2)}; submitted: $${(Number(transaction_amount_cents) / 100).toFixed(2)}.`,
      });
      return;
    }

    const record = await bidService.recordPaymentTransaction(bid.id, req.user.userId, {
      payment_method, transaction_reference, transaction_date,
      transaction_amount_cents: Number(transaction_amount_cents),
      proof_doc_s3_key: proof_s3_key,
      contractor_notes,
    });

    // Project closure: mark this project completed and stop bidding on it.
    await projectDb.query(
      `UPDATE projects SET status = 'completed', is_listed = false, updated_at = NOW() WHERE id = $1`,
      [bid.project_id]
    );
    await biddingDb.query(
      `UPDATE bids SET selection_workflow_state = 'payment_received', updated_at = NOW() WHERE id = $1`,
      [bid.id]
    );

    // Generate the contractor-issued final payment receipt (BidWork is just the renderer).
    let receipt = null;
    try {
      const { receiptGenerator } = await import('../services/receiptGenerator');
      receipt = await receiptGenerator.generateContractorPaymentReceipt(bid.id);
    } catch (err) {
      console.error('Contractor receipt generation failed (non-fatal):', err);
    }

    res.status(201).json({ success: true, data: { record, project_status: 'completed', receipt } });
  } catch (error: any) {
    const status = error.message?.includes('already exists') ? 409 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
}

export async function answerQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { answer } = req.body;
    if (!answer?.trim()) { res.status(400).json({ success: false, error: 'answer is required' }); return; }
    const result = await questionModerationService.answerQuestion(req.params.questionId, answer);
    if (!result) { res.status(404).json({ success: false, error: 'Question not found' }); return; }
    res.status(200).json({ success: true, data: { question: result } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

// ── Visit tracking (post-deposit, post-start-date) ──

export async function getVisitStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { visitTrackingService } = await import('../services/visitTrackingService');
    const status = await visitTrackingService.getStatus(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: status });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function postVisitConfirmation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { visited } = req.body || {};
    if (typeof visited !== 'boolean') { res.status(400).json({ success: false, error: 'visited (boolean) is required' }); return; }
    const { visitTrackingService } = await import('../services/visitTrackingService');
    const status = await visitTrackingService.confirmVisit(req.params.id, req.user.userId, visited);
    res.status(200).json({ success: true, data: status });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function postVisitReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { visitTrackingService } = await import('../services/visitTrackingService');
    const status = await visitTrackingService.sendReminder(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: status });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function postAbandonNoShow(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { note } = req.body || {};
    const { visitTrackingService } = await import('../services/visitTrackingService');
    const status = await visitTrackingService.abandonAsNoShow(req.params.id, req.user.userId, note);
    res.status(200).json({ success: true, data: status });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

// ── Contractor ratings ──

export async function postRequestRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { ratingService } = await import('../services/ratingService');
    const result = await ratingService.requestRating(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function postSubmitRating(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { rating, review_text } = req.body || {};
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'rating must be an integer between 1 and 5' }); return;
    }
    const { ratingService } = await import('../services/ratingService');
    const result = await ratingService.submitRating(req.params.id, req.user.userId, rating, review_text || null);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function getRatingForBid(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { ratingService } = await import('../services/ratingService');
    const row = await ratingService.getRatingForBid(req.params.id, req.user.userId);
    res.status(200).json({ success: true, data: row });
  } catch (error: any) {
    const code = error.message?.includes('Not authorized') ? 403 : 400;
    res.status(code).json({ success: false, error: error.message });
  }
}

export async function getContractorReputation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { ratingService } = await import('../services/ratingService');
    const result = await ratingService.getContractorReputation(req.params.contractorId);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}
