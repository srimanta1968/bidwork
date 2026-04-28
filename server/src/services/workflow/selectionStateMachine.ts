import { biddingDb } from '../domainDb';

/**
 * Selection workflow state machine. Pure helper around bidding.workflow_audit_log:
 * record every state transition the bidService performs so we have a single
 * append-only history per entity. Service code calls recordTransition right
 * after the UPDATE that changes selection_workflow_state.
 *
 * Allowed transitions are advisory; the bidService is the source of truth and
 * already enforces preconditions for each state move.
 */
export const ALLOWED_STATES = [
  'pending', 'shortlisted', 'approved_by_owner', 'offer_accepted',
  'contract_drafted', 'contract_owner_signed', 'contract_contractor_signed',
  'addresses_revealed', 'in_progress', 'completion_submitted',
  'completion_acknowledged', 'payment_received', 'receipt_issued',
  'paused', 'rejected', 'withdrawn', 'abandoned',
] as const;
export type SelectionState = typeof ALLOWED_STATES[number];

export interface TransitionInput {
  entityType?: string;
  entityId: string;
  stateFrom: SelectionState | string | null;
  stateTo: SelectionState | string;
  actorUserId?: string | null;
  actorRole?: 'homeowner' | 'contractor' | 'system' | 'admin' | null;
  reason?: string | null;
  payload?: Record<string, any>;
}

export async function recordTransition(input: TransitionInput): Promise<void> {
  try {
    await biddingDb.query(
      `INSERT INTO workflow_audit_log (entity_type, entity_id, state_from, state_to, actor_user_id, actor_role, reason, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        input.entityType || 'bid', input.entityId,
        input.stateFrom, input.stateTo,
        input.actorUserId || null, input.actorRole || null,
        input.reason || null, JSON.stringify(input.payload || {}),
      ]
    );
  } catch (error) {
    // Audit failures should never crash a transition.
    console.error('[audit] recordTransition failed:', error);
  }
}

export async function listAuditLog(entityId: string, limit: number = 50) {
  return await biddingDb.queryAll(
    `SELECT * FROM workflow_audit_log WHERE entity_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [entityId, limit]
  );
}

export const selectionStateMachine = { ALLOWED_STATES, recordTransition, listAuditLog };
