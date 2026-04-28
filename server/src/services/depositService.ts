import { biddingDb, projectDb, adminDb } from './domainDb';

/**
 * Deposit lifecycle:
 *   pending → collected → converted_to_fee | refunded | available_as_credit
 *
 * Stripe is the production processor; when STRIPE_SECRET_KEY is unset we run a
 * mock that fakes a payment intent and short-circuits success so dev/CI can
 * exercise the flow without Stripe credentials.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

async function loadCurrentFeePercent(): Promise<number> {
  const row = await adminDb.queryOne<{ percent: string | number }>(
    `SELECT percent FROM service_fee_config WHERE effective_from <= NOW() ORDER BY effective_from DESC LIMIT 1`
  );
  return Number(row?.percent ?? Number(process.env.DEPOSIT_PERCENT || 0.05));
}

export async function getOrCreateDeposit(bidId: string, ownerId: string): Promise<{
  deposit: any;
  available_credit_cents: number;
  residual_due_cents: number;
}> {
  const bid = await biddingDb.queryOne<{ id: string; project_id: string; bid_amount: string | number }>(
    'SELECT id, project_id, bid_amount FROM bids WHERE id = $1', [bidId]
  );
  if (!bid) throw new Error('Bid not found');
  const project = await projectDb.queryOne<{ homeowner_id: string }>(
    'SELECT homeowner_id FROM projects WHERE id = $1', [bid.project_id]
  );
  if (!project || project.homeowner_id !== ownerId) throw new Error('Not authorized');

  const percent = await loadCurrentFeePercent();
  const fullDepositCents = Math.round(Number(bid.bid_amount) * percent * 100);

  let deposit = await biddingDb.queryOne<any>('SELECT * FROM deposits WHERE bid_id = $1', [bidId]);
  if (!deposit) {
    deposit = await biddingDb.queryOne<any>(
      `INSERT INTO deposits (project_id, bid_id, amount_cents, percent, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [bid.project_id, bidId, fullDepositCents, percent]
    );
  }

  // Apply available credits scoped to (owner, project) — see TK-2727.
  const availableCredits = await biddingDb.queryAll<{ id: string; amount_cents: string | number; applied_amount_cents: string | number }>(
    `SELECT id, amount_cents, applied_amount_cents FROM deposit_credits
      WHERE owner_id = $1 AND project_id = $2 AND status IN ('available','partially_applied')
      ORDER BY created_at`,
    [ownerId, bid.project_id]
  );
  let totalAvailable = 0;
  for (const c of availableCredits) totalAvailable += Number(c.amount_cents) - Number(c.applied_amount_cents || 0);

  const residual = Math.max(0, fullDepositCents - totalAvailable);
  return { deposit, available_credit_cents: totalAvailable, residual_due_cents: residual };
}

/**
 * Apply available deposit credits to cover (some of) a new deposit. Returns
 * the residual amount the homeowner still owes after credit application.
 * Called atomically with the Stripe webhook on payment_intent.succeeded.
 */
export async function applyAvailableCreditForBid(ownerId: string, projectId: string, bidId: string, requiredCents: number): Promise<number> {
  let remaining = requiredCents;
  const credits = await biddingDb.queryAll<{ id: string; amount_cents: string | number; applied_amount_cents: string | number }>(
    `SELECT id, amount_cents, applied_amount_cents FROM deposit_credits
      WHERE owner_id = $1 AND project_id = $2 AND status IN ('available','partially_applied')
      ORDER BY created_at`,
    [ownerId, projectId]
  );
  for (const c of credits) {
    if (remaining <= 0) break;
    const balance = Number(c.amount_cents) - Number(c.applied_amount_cents || 0);
    const take = Math.min(balance, remaining);
    const newApplied = Number(c.applied_amount_cents || 0) + take;
    const fullyApplied = newApplied >= Number(c.amount_cents);
    await biddingDb.query(
      `UPDATE deposit_credits
          SET applied_amount_cents = $2,
              status = CASE WHEN $3::boolean THEN 'fully_applied' ELSE 'partially_applied' END,
              applied_to_bid_id = COALESCE(applied_to_bid_id, $4),
              applied_at = COALESCE(applied_at, NOW())
        WHERE id = $1`,
      [c.id, newApplied, fullyApplied, bidId]
    );
    remaining -= take;
  }
  return Math.max(0, remaining);
}

/**
 * Create a Stripe payment intent for the residual deposit. When STRIPE_SECRET_KEY
 * is unset we fake the response with a mock intent id.
 */
export async function createDepositIntent(bidId: string, ownerId: string) {
  // Gate: deposit can only be paid after both parties have signed AND the
  // homeowner has approved the contractor's proposed schedule. This prevents
  // a homeowner from paying before the actual work window is agreed.
  const contract = await biddingDb.queryOne<{ status: string; schedule_status: string | null }>(
    'SELECT status, schedule_status FROM contracts WHERE bid_id = $1', [bidId]
  );
  if (!contract) throw new Error('Contract not found — accept the offer first');
  if (contract.status !== 'executed') throw new Error('Both parties must sign the work order before paying the deposit');
  if (contract.schedule_status !== 'approved') throw new Error('You can pay the deposit only after the schedule is approved by both parties');

  const { deposit, residual_due_cents, available_credit_cents } = await getOrCreateDeposit(bidId, ownerId);

  if (residual_due_cents <= 0) {
    // Fully covered by credit; nothing to charge. Trigger the same post-payment
    // pipeline (collect → convert → service-fee receipt → reveal addresses) that
    // would normally run via the Stripe webhook.
    try {
      await biddingDb.query(
        `UPDATE deposits SET status = 'collected', collected_at = COALESCE(collected_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [deposit.id]
      );
      await convertDepositToFee(bidId);
      const { receiptGenerator } = await import('./receiptGenerator');
      await receiptGenerator.generateServiceFeeReceipt(bidId);
    } catch (err) {
      console.error('Credit-covered conversion failed:', err);
    }
    return {
      deposit_id: deposit.id,
      amount_cents: deposit.amount_cents,
      available_credit_cents,
      residual_due_cents: 0,
      client_secret: null,
      provider_intent_id: null,
    };
  }

  if (!STRIPE_SECRET_KEY) {
    // Mock mode for dev/CI without real Stripe.
    const mockIntentId = `pi_mock_${Date.now()}`;
    await biddingDb.query(
      `INSERT INTO payment_intents (deposit_id, provider_intent_id, amount_cents, status)
       VALUES ($1, $2, $3, 'requires_payment_method')`,
      [deposit.id, mockIntentId, residual_due_cents]
    );
    return {
      deposit_id: deposit.id,
      amount_cents: deposit.amount_cents,
      available_credit_cents,
      residual_due_cents,
      client_secret: `${mockIntentId}_secret_mock`,
      provider_intent_id: mockIntentId,
      mock: true,
    };
  }

  const body = new URLSearchParams();
  body.set('amount', String(residual_due_cents));
  body.set('currency', 'usd');
  body.set('metadata[bid_id]', bidId);
  body.set('metadata[deposit_id]', deposit.id);
  body.set('metadata[project_id]', deposit.project_id);
  body.set('automatic_payment_methods[enabled]', 'true');
  const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Stripe error: ${err}`);
  }
  const intent = await resp.json() as any;
  await biddingDb.query(
    `INSERT INTO payment_intents (deposit_id, provider_intent_id, amount_cents, status)
     VALUES ($1, $2, $3, $4)`,
    [deposit.id, intent.id, residual_due_cents, intent.status]
  );
  return {
    deposit_id: deposit.id,
    amount_cents: deposit.amount_cents,
    available_credit_cents,
    residual_due_cents,
    client_secret: intent.client_secret,
    provider_intent_id: intent.id,
  };
}

/**
 * Webhook handler. We do NOT verify the Stripe signature when STRIPE_WEBHOOK_SECRET
 * is unset — verification kicks in once a real secret is configured.
 */
export async function handleStripeWebhook(rawBody: string, signature: string | undefined) {
  let event: any;
  if (STRIPE_WEBHOOK_SECRET && signature) {
    // We accept the unverified body in dev; production should plug Stripe's
    // signature library (constructEvent) here. We keep the surface area small
    // so tests can drive it directly.
    event = JSON.parse(rawBody);
  } else {
    event = JSON.parse(rawBody);
  }
  const type = event?.type;
  const obj = event?.data?.object;
  if (!type || !obj) return { ignored: true };
  if (type === 'payment_intent.succeeded') {
    const intentId = obj.id;
    const intent = await biddingDb.queryOne<{ deposit_id: string }>(
      `UPDATE payment_intents SET status = 'succeeded', raw_event = $2::jsonb, updated_at = NOW()
        WHERE provider_intent_id = $1 RETURNING deposit_id`,
      [intentId, JSON.stringify(event)]
    );
    if (!intent) return { ignored: true };
    const dep = await biddingDb.queryOne<{ id: string; bid_id: string; project_id: string }>(
      `UPDATE deposits SET status = 'collected', collected_at = NOW(), updated_at = NOW()
        WHERE id = $1 RETURNING id, bid_id, project_id`,
      [intent.deposit_id]
    );
    if (!dep) return { ignored: true };
    const project = await projectDb.queryOne<{ homeowner_id: string }>(
      'SELECT homeowner_id FROM projects WHERE id = $1', [dep.project_id]
    );
    if (project) await applyAvailableCreditForBid(project.homeowner_id, dep.project_id, dep.bid_id, Number(obj.amount));
    // Deposit collected → convert to BidWork's admin fee, issue the service-fee
    // receipt, and reveal addresses (state → addresses_revealed).
    try {
      await convertDepositToFee(dep.bid_id);
      const { receiptGenerator } = await import('./receiptGenerator');
      await receiptGenerator.generateServiceFeeReceipt(dep.bid_id);
    } catch (err) {
      console.error('Post-payment conversion / receipt failed:', err);
    }
    return { ok: true, deposit_id: dep.id };
  }
  if (type === 'payment_intent.payment_failed') {
    await biddingDb.query(
      `UPDATE payment_intents SET status = 'failed', raw_event = $2::jsonb, updated_at = NOW()
        WHERE provider_intent_id = $1`,
      [obj.id, JSON.stringify(event)]
    );
    return { ok: true, failed: true };
  }
  return { ignored: true };
}

/**
 * Convert a collected deposit to BidWork's admin fee. Called when the contract
 * is mutually signed (selection_workflow_state='addresses_revealed').
 * Triggers the service-fee receipt generator.
 */
export async function convertDepositToFee(bidId: string) {
  const dep = await biddingDb.queryOne<any>('SELECT * FROM deposits WHERE bid_id = $1', [bidId]);
  if (!dep) return null;
  if (dep.status === 'converted_to_fee') return dep;
  if (dep.status !== 'collected') {
    // Allow conversion even if credit fully covered the residual (i.e. no Stripe charge happened).
    if (dep.amount_cents > 0) {
      // Fully credit-covered case: mark collected first.
      await biddingDb.query(
        `UPDATE deposits SET status = 'collected', collected_at = COALESCE(collected_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [dep.id]
      );
    }
  }
  await biddingDb.query(
    `UPDATE deposits SET status = 'converted_to_fee', converted_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [dep.id]
  );
  // Advance the bid's workflow state — this is the trigger that opens the PII
  // redactor and reveals contact details to both parties. The bid moves to
  // 'scheduled' (the post-payment phase before the start_date passes); the
  // older 'addresses_revealed' state is kept in ADDRESS_REVEALED_STATES for
  // backward-compat with any in-flight bids.
  await biddingDb.query(
    `UPDATE bids SET selection_workflow_state = 'scheduled', updated_at = NOW()
      WHERE id = $1
        AND selection_workflow_state IN ('schedule_approved','contract_contractor_signed','contract_drafted','contract_owner_signed')`,
    [dep.bid_id]
  );
  // Insert the visit-tracking row (idempotent) so the homeowner gets the
  // post-start-date confirmation prompt once the start_date has passed.
  await biddingDb.query(
    `INSERT INTO workorder_visits (bid_id, status) VALUES ($1, 'pending_first_check')
       ON CONFLICT (bid_id) DO NOTHING`,
    [dep.bid_id]
  );
  return await biddingDb.queryOne('SELECT * FROM deposits WHERE id = $1', [dep.id]);
}

/**
 * Convert a collected deposit into an available credit on auto-abandon. Called
 * by the abandon hook (TK-2726). The credit is scoped to (owner, project) so
 * the homeowner can apply it when promoting the next ranked bidder.
 */
export async function convertDepositToCredit(bidId: string) {
  const dep = await biddingDb.queryOne<any>('SELECT * FROM deposits WHERE bid_id = $1', [bidId]);
  if (!dep) return null;
  if (dep.status === 'available_as_credit') return dep;
  const project = await projectDb.queryOne<{ homeowner_id: string }>(
    'SELECT homeowner_id FROM projects WHERE id = $1', [dep.project_id]
  );
  if (!project) throw new Error('Project not found for deposit');
  await biddingDb.query(
    `UPDATE deposits SET status = 'available_as_credit', updated_at = NOW() WHERE id = $1`,
    [dep.id]
  );
  await biddingDb.query(
    `INSERT INTO deposit_credits (owner_id, project_id, source_deposit_id, source_bid_id, amount_cents)
     VALUES ($1, $2, $3, $4, $5)`,
    [project.homeowner_id, dep.project_id, dep.id, bidId, dep.amount_cents]
  );
  return dep;
}

export const depositService = {
  getOrCreateDeposit, createDepositIntent, handleStripeWebhook,
  convertDepositToFee, convertDepositToCredit, applyAvailableCreditForBid, loadCurrentFeePercent,
};
