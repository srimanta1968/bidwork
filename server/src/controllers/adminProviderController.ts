import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as providerService from '../services/adminProviderService';
import * as feedbackService from '../services/feedbackService';
import { testConnection as testLlmConnection, defaultModelFor, LlmProvider, chatCompletion } from '../services/llmProviderService';
import { sendTestEmail, sendPersonalEmail } from '../services/emailService';
import { adminService } from '../services/adminService';

const LLM_PROVIDERS: LlmProvider[] = ['openai', 'gemini', 'together'];

function badRequest(res: Response, error: string) {
  res.status(400).json({ success: false, error });
}

export async function listProvidersHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const kindRaw = req.query.kind as string | undefined;
    if (kindRaw && kindRaw !== 'llm' && kindRaw !== 'email') {
      return badRequest(res, "kind must be 'llm' or 'email'");
    }
    const rows = await providerService.listProviders(kindRaw as any);
    res.status(200).json({ success: true, data: { providers: rows } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function upsertProviderHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { kind, provider, model, api_key, from_email, from_name, is_default } = req.body || {};
    if (!kind) return badRequest(res, 'kind is required');
    if (!provider) return badRequest(res, 'provider is required');
    if (!api_key || typeof api_key !== 'string') return badRequest(res, 'api_key is required');

    const adminId = req.user?.userId;
    if (!adminId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const saved = await providerService.upsertProvider({
      kind, provider, model, api_key, from_email, from_name, is_default,
      updated_by_admin_id: adminId,
    });
    res.status(200).json({ success: true, data: { provider: saved } });
  } catch (err: any) {
    if (err.message?.startsWith('Invalid ')) return badRequest(res, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function setDefaultProviderHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) return badRequest(res, 'id is required');
    const saved = await providerService.setDefault(id);
    res.status(200).json({ success: true, data: { provider: saved } });
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteProviderHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) return badRequest(res, 'id is required');
    const ok = await providerService.softDelete(id);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }
    res.status(200).json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function testLlmHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { provider, api_key, model } = req.body || {};
    if (!provider || !LLM_PROVIDERS.includes(provider)) {
      return badRequest(res, `provider must be one of ${LLM_PROVIDERS.join(', ')}`);
    }
    if (!api_key || typeof api_key !== 'string') {
      return badRequest(res, 'api_key is required');
    }
    const result = await testLlmConnection(provider, api_key, model || defaultModelFor(provider));
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function testEmailHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { provider, api_key, from_email, from_name, to } = req.body || {};
    if (provider !== 'sendgrid') return badRequest(res, "provider must be 'sendgrid'");
    if (!api_key) return badRequest(res, 'api_key is required');
    if (!from_email) return badRequest(res, 'from_email is required');
    if (!to) return badRequest(res, 'to is required');
    const result = await sendTestEmail({ apiKey: api_key, fromEmail: from_email, fromName: from_name, to });
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function sendUserEmailHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) return badRequest(res, 'user id is required');
    const { subject, body } = req.body || {};
    if (!subject || typeof subject !== 'string') return badRequest(res, 'subject is required');
    if (!body || typeof body !== 'string') return badRequest(res, 'body is required');

    const user = await adminService.getUserById(id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    if (!(user as any).email) {
      res.status(400).json({ success: false, error: 'User has no email on file' });
      return;
    }

    const adminId = req.user?.userId || null;
    const result = await sendPersonalEmail({
      to: (user as any).email,
      subject,
      body,
      sent_by_admin_id: adminId,
      recipient_user_id: id,
    });
    res.status(result.success ? 200 : 502).json({
      success: result.success,
      data: { email_log_id: result.email_log_id, status: result.status, provider: result.provider },
      error: result.error,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ── Customer feedback ──

export async function listFeedbackHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const context = req.query.context as string | undefined;
    const project_id = req.query.project_id as string | undefined;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const out = await feedbackService.listFeedback({ status: status as any, context, project_id, page, limit });
    res.status(200).json({ success: true, data: out });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function setFeedbackStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return badRequest(res, 'status is required');
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const updated = await feedbackService.setStatus(id, status, req.user.userId);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Feedback not found' });
      return;
    }
    res.status(200).json({ success: true, data: { feedback: updated } });
  } catch (err: any) {
    if (err.message?.startsWith('status')) return badRequest(res, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function summarizeFeedbackHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { ids, filter } = req.body || {};
    const messages = await feedbackService.getMessagesForSummary({
      ids: Array.isArray(ids) ? ids : undefined,
      status: filter?.status,
      context: filter?.context,
    });
    if (messages.length === 0) {
      res.status(200).json({ success: true, data: { summary: '(no feedback to summarize)', count: 0, model: null } });
      return;
    }
    const numbered = messages.map((m, i) => `${i + 1}. ${m}`).join('\n');
    try {
      const r = await chatCompletion({
        messages: [
          { role: 'system', content: 'You summarize a batch of customer feedback notes from a home-services platform. Output 2-4 short paragraphs covering: recurring themes, things customers love, things they complain about, and any feature requests. Be concrete, no fluff, no fake percentages.' },
          { role: 'user', content: `Here are ${messages.length} feedback notes:\n\n${numbered}` },
        ],
        maxTokens: 600,
      });
      res.status(200).json({ success: true, data: { summary: r.content, count: messages.length, model: r.model } });
    } catch (err: any) {
      res.status(200).json({ success: false, error: err?.message || 'LLM summarize failed', data: { count: messages.length } });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
