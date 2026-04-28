import { Request, Response } from 'express';
import { depositService } from '../services/depositService';

/**
 * POST /api/webhooks/stripe — receives payment_intent events. No auth header
 * (Stripe signs the body); we verify when STRIPE_WEBHOOK_SECRET is configured.
 *
 * The Express body parser converts JSON for us; for production-grade signature
 * verification you'll want raw body access. This handler is signature-tolerant
 * for now and treats body parsing as authoritative.
 */
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = (req.headers['stripe-signature'] as string) || undefined;
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const result = await depositService.handleStripeWebhook(body, signature);
    res.status(200).json({ received: true, ...result });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ received: false, error: error.message });
  }
}
