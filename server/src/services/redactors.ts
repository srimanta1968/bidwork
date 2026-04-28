/**
 * Role-aware PII redactors used by bid/project response serializers.
 *
 * Privacy invariant:
 *   - Contractors never see homeowner email, phone, or full street address.
 *     The owner's city + zip are public.
 *   - Homeowners never see contractor email, phone, or business street address.
 *     Display name, business name, license number, city, state, rating, profile
 *     photo, abandonment flags are public.
 *   - The full address pair is exchanged ONLY when a bid has been accepted by
 *     the homeowner (winning contractor) — once contractor flow lands a bid in
 *     status='accepted' or selection_workflow_state in ('addresses_revealed',
 *     'in_progress','completion_submitted','completion_acknowledged',
 *     'payment_received','receipt_issued'), the redactor returns full data.
 */

const HOMEOWNER_PUBLIC_FIELDS = ['id', 'first_name', 'last_name', 'role', 'created_at'];
const CONTRACTOR_PUBLIC_FIELDS = [
  'id', 'user_id', 'business_name', 'legal_company_name', 'license_number', 'license_type',
  'category', 'skills', 'years_experience', 'bio', 'is_verified',
  'serving_cities', 'serving_zipcodes', 'abandonment_flag_count', 'last_abandoned_at',
];

// Address pair is exchanged ONLY after BidWork has actually collected the
// deposit — i.e. after the deposit has converted to fee. Pre-deposit signing
// or schedule approval don't reveal anything. The states below are reachable
// only after deposit conversion (see depositService.convertDepositToFee +
// the post-deposit transitions in selectionStateMachine).
const ADDRESS_REVEALED_STATES = new Set([
  'scheduled',
  'addresses_revealed', 'in_progress', 'completion_submitted',
  'completion_acknowledged', 'payment_received', 'receipt_issued',
]);

export function shouldRevealAddress(bidStatus?: string | null, workflowState?: string | null): boolean {
  if (bidStatus === 'accepted') return true;
  return !!(workflowState && ADDRESS_REVEALED_STATES.has(workflowState));
}

/**
 * Mask a full street address to "city, state zip" by dropping the leading street line.
 * Falls back to the original string when it cannot be split.
 */
export function maskAddress(fullAddress: string | null | undefined): string {
  if (!fullAddress) return '';
  const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(', ');
  return fullAddress;
}

export interface RedactOptions {
  bidStatus?: string | null;
  workflowState?: string | null;
}

export function redactProjectForContractor<T extends Record<string, any>>(project: T, opts: RedactOptions = {}): T {
  if (!project) return project;
  const reveal = shouldRevealAddress(opts.bidStatus, opts.workflowState);
  if (reveal) return project;
  const out: any = { ...project };
  out.location_address = maskAddress(project.location_address);
  // Don't expose homeowner email/phone via project (project rows don't have them
  // today, but if any joined query brings them through, strip defensively).
  delete out.homeowner_email;
  delete out.homeowner_phone;
  return out;
}

export function redactHomeownerForContractor<T extends Record<string, any>>(homeowner: T, opts: RedactOptions = {}): Partial<T> {
  if (!homeowner) return homeowner as Partial<T>;
  if (shouldRevealAddress(opts.bidStatus, opts.workflowState)) return homeowner;
  const out: any = {};
  for (const k of HOMEOWNER_PUBLIC_FIELDS) if (k in homeowner) out[k] = homeowner[k];
  return out;
}

export function redactContractorForOwner<T extends Record<string, any>>(contractor: T, opts: RedactOptions = {}): Partial<T> {
  if (!contractor) return contractor as Partial<T>;
  if (shouldRevealAddress(opts.bidStatus, opts.workflowState)) return contractor;
  const out: any = {};
  for (const k of CONTRACTOR_PUBLIC_FIELDS) if (k in contractor) out[k] = contractor[k];
  // Strip any street address fields if they've leaked into the row
  delete out.office_address;
  delete out.billing_address_line1;
  delete out.billing_address_line2;
  delete out.email;
  delete out.phone;
  delete out.billing_phone;
  return out;
}

/**
 * Strip PII from a bid row when serializing to either side. Both contractor and
 * homeowner only need scalar bid data; PII lives on the related profile rows.
 */
export function redactBidForViewer<T extends Record<string, any>>(bid: T): T {
  if (!bid) return bid;
  const out: any = { ...bid };
  delete out.contractor_email;
  delete out.contractor_phone;
  delete out.homeowner_email;
  delete out.homeowner_phone;
  return out;
}
