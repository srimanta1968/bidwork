import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { submitBid, getProjectBids, getMyBids, acceptBid, rejectBid, submitQuestion, getProjectQuestions, answerQuestion, getBidById, updateBid, presignPaymentProof, confirmPayment, submitAdditionalWork, acceptAdditionalWork, rejectAdditionalWork, listAdditionalWork, shortlistBid, clearShortlist, selectAndNotify, patchBidStatus, presignBidAttachment, finalizeBidAttachment, listBidAttachments, deleteBidAttachment, postBidMessage, listBidMessages, markBidMessageRead, acceptOffer, getContract, signContract, createDepositIntent, listBidReceipts, proposeSchedule, approveSchedule, rejectSchedule, getVisitStatus, postVisitConfirmation, postVisitReminder, postAbandonNoShow, postRequestRating, postSubmitRating, getRatingForBid, getContractorReputation } from '../controllers/bidController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

router.post('/', authenticate, wrap(submitBid));
router.get('/my-bids', authenticate, wrap(getMyBids));
router.get('/project/:projectId', authenticate, wrap(getProjectBids));
router.get('/:id', authenticate, wrap(getBidById));
router.put('/:id', authenticate, wrap(updateBid));
router.post('/:id/accept', authenticate, wrap(acceptBid));
router.post('/:id/reject', authenticate, wrap(rejectBid));
router.post('/:id/shortlist', authenticate, wrap(shortlistBid));
router.delete('/:id/shortlist', authenticate, wrap(clearShortlist));
router.post('/:id/select-notify', authenticate, wrap(selectAndNotify));
router.patch('/:id/status', authenticate, wrap(patchBidStatus));

// Bid attachments
router.post('/:id/attachments/presign', authenticate, wrap(presignBidAttachment));
router.post('/:id/attachments', authenticate, wrap(finalizeBidAttachment));
router.get('/:id/attachments', authenticate, wrap(listBidAttachments));
router.delete('/:id/attachments/:attachmentId', authenticate, wrap(deleteBidAttachment));

// Private bid messaging (owner ↔ that bid's contractor)
router.get('/:id/messages', authenticate, wrap(listBidMessages));
router.post('/:id/messages', authenticate, wrap(postBidMessage));
router.patch('/:id/messages/:messageId/read', authenticate, wrap(markBidMessageRead));

// Contract acceptance + signing
router.post('/:id/accept-offer', authenticate, wrap(acceptOffer));
router.get('/:id/contract', authenticate, wrap(getContract));
router.post('/:id/contract/sign', authenticate, wrap(signContract));
router.post('/:id/contract/schedule', authenticate, wrap(proposeSchedule));
router.patch('/:id/contract/schedule/approve', authenticate, wrap(approveSchedule));
router.patch('/:id/contract/schedule/reject', authenticate, wrap(rejectSchedule));

// Deposit + receipts
router.post('/:id/deposit/intent', authenticate, wrap(createDepositIntent));
router.get('/:id/receipts', authenticate, wrap(listBidReceipts));
router.post('/:id/payment-proof/presign', authenticate, wrap(presignPaymentProof));
router.post('/:id/payment-confirmed', authenticate, wrap(confirmPayment));

// Additional work orders (recording-only, owner-acceptance gated; no fee)
router.get('/:bidId/additional-work', authenticate, wrap(listAdditionalWork));
router.post('/:bidId/additional-work', authenticate, wrap(submitAdditionalWork));
router.post('/:bidId/additional-work/:awoId/accept', authenticate, wrap(acceptAdditionalWork));
router.post('/:bidId/additional-work/:awoId/reject', authenticate, wrap(rejectAdditionalWork));

// Q&A endpoints
router.post('/questions', authenticate, wrap(submitQuestion));
router.get('/questions/project/:projectId', authenticate, wrap(getProjectQuestions));
router.put('/questions/:questionId/reply', authenticate, wrap(answerQuestion));

// Visit tracking (post-deposit, post-start-date)
router.get('/:id/visit-status', authenticate, wrap(getVisitStatus));
router.post('/:id/visit-confirmation', authenticate, wrap(postVisitConfirmation));
router.post('/:id/visit-reminder', authenticate, wrap(postVisitReminder));
router.post('/:id/abandon-no-show', authenticate, wrap(postAbandonNoShow));

// Contractor ratings
router.post('/:id/request-rating', authenticate, wrap(postRequestRating));
router.post('/:id/rating', authenticate, wrap(postSubmitRating));
router.get('/:id/rating', authenticate, wrap(getRatingForBid));
router.get('/contractor/:contractorId/reputation', authenticate, wrap(getContractorReputation));

export default router;
