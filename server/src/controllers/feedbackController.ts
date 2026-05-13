import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as feedbackService from '../services/feedbackService';

/**
 * POST /api/feedback — any logged-in user can submit a feedback note.
 */
export async function submitFeedbackHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const { message, context, project_id } = req.body || {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'message (string) is required' });
      return;
    }
    const row = await feedbackService.submitFeedback({
      user_id: req.user.userId,
      message,
      context,
      project_id: project_id || null,
    });
    res.status(201).json({ success: true, data: { feedback: row } });
  } catch (err: any) {
    if (err?.message?.startsWith('message') || err?.message?.startsWith('context')) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  }
}
