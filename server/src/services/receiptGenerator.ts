import { createHash } from 'crypto';
import { biddingDb, projectDb, authDb } from './domainDb';
import { s3Service } from './s3Service';

function escapeHtml(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function nextReceiptNumber(prefix: 'SF' | 'CR'): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ymd}-${seq}`;
}

async function uploadHtml(s3Key: string, html: string) {
  const { url } = await s3Service.getPresignedUploadUrl(s3Key, 'text/html');
  await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'text/html' }, body: html });
}

/**
 * BidWork-issued service fee receipt for the platform fee (deposit). Issuer is
 * BidWork (RECEIPT_COMPANY_LEGAL_NAME), recipient is the homeowner.
 */
export async function generateServiceFeeReceipt(bidId: string) {
  const existing = await biddingDb.queryOne<any>('SELECT * FROM service_fee_receipts WHERE bid_id = $1', [bidId]);
  if (existing) return existing;
  const dep = await biddingDb.queryOne<any>('SELECT * FROM deposits WHERE bid_id = $1', [bidId]);
  if (!dep) throw new Error('No deposit on this bid');
  const project = await projectDb.queryOne<any>('SELECT id, title, homeowner_id FROM projects WHERE id = $1', [dep.project_id]);
  if (!project) throw new Error('Project not found');
  const owner = await authDb.queryOne<any>('SELECT first_name, last_name, email FROM users WHERE id = $1', [project.homeowner_id]);
  const number = nextReceiptNumber('SF');
  const issuerName = process.env.RECEIPT_COMPANY_LEGAL_NAME || 'BidWork, Inc.';
  const issuerAddress = process.env.RECEIPT_COMPANY_ADDRESS || '';
  const issuerTax = process.env.RECEIPT_TAX_ID || '';

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${number}</title>
    <style>body{font-family:Inter,Arial,sans-serif;max-width:680px;margin:32px auto;padding:24px;color:#0f172a;}h1{font-size:22px;margin:0 0 4px;}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;}td,th{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;}.muted{color:#64748b;font-size:12px;}.total{font-weight:700;font-size:16px;color:#1e3a8a;}</style></head><body>
    <h1>Service Fee Receipt</h1>
    <p class="muted">Receipt # ${number} · Issued ${new Date().toLocaleString()}</p>
    <h3 style="margin-top:24px;">From</h3>
    <p>${escapeHtml(issuerName)}<br>${escapeHtml(issuerAddress)}<br>${issuerTax ? 'Tax ID: ' + escapeHtml(issuerTax) : ''}</p>
    <h3 style="margin-top:24px;">To</h3>
    <p>${escapeHtml(`${owner?.first_name || ''} ${owner?.last_name || ''}`.trim())}<br>${escapeHtml(owner?.email || '')}</p>
    <table><thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>
      <tr><td>Platform service fee — ${(Number(dep.percent) * 100).toFixed(2)}% of contract value for project "${escapeHtml(project.title || '')}"</td><td style="text-align:right;">$${(Number(dep.amount_cents)/100).toFixed(2)}</td></tr>
    </tbody>
    <tfoot><tr><td class="total" style="text-align:right;">Total</td><td class="total" style="text-align:right;">$${(Number(dep.amount_cents)/100).toFixed(2)}</td></tr></tfoot>
    </table>
    <p class="muted" style="margin-top:24px;">This receipt covers BidWork's platform service fee only. Payment for the work itself is made directly between homeowner and contractor; that payment is documented in a separate contractor-issued receipt.</p>
    </body></html>`;

  const s3Key = `${process.env.S3_PREFIX || 'bidwork'}/receipts/service-fee/${bidId}/${number}.html`;
  await uploadHtml(s3Key, html);

  return await biddingDb.queryOne<any>(
    `INSERT INTO service_fee_receipts (bid_id, project_id, deposit_id, owner_id, amount_cents, percent_at_time, receipt_pdf_s3_key, receipt_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [bidId, dep.project_id, dep.id, project.homeowner_id, dep.amount_cents, dep.percent, s3Key, number]
  );
}

/**
 * Contractor-issued final payment receipt. Issuer is the contractor (using
 * their billing/tax profile), recipient is the homeowner. BidWork only renders
 * the document — the legal seller is the contractor.
 */
export async function generateContractorPaymentReceipt(bidId: string) {
  const existing = await biddingDb.queryOne<any>('SELECT * FROM contractor_payment_receipts WHERE bid_id = $1', [bidId]);
  if (existing) return existing;
  const bid = await biddingDb.queryOne<any>('SELECT * FROM bids WHERE id = $1', [bidId]);
  if (!bid) throw new Error('Bid not found');
  const project = await projectDb.queryOne<any>('SELECT id, title, homeowner_id FROM projects WHERE id = $1', [bid.project_id]);
  const owner = await authDb.queryOne<any>('SELECT first_name, last_name, email FROM users WHERE id = $1', [project.homeowner_id]);
  const contractorProfile = await authDb.queryOne<any>(
    `SELECT legal_company_name, business_name, ein, billing_address_line1, billing_address_line2,
            billing_city, billing_state, billing_zip, billing_phone, signature_s3_key
       FROM contractor_profiles WHERE user_id = $1`, [bid.contractor_id]
  );
  if (!contractorProfile?.legal_company_name) throw new Error('Contractor billing profile incomplete');

  const breakdown = await biddingDb.queryAll<any>(
    `SELECT btb.task_id, btb.labor_cost, btb.materials_subtotal, btb.line_total, st.title
       FROM bid_task_breakdown btb LEFT JOIN scope_tasks st ON st.id = btb.task_id
      WHERE btb.bid_id = $1 ORDER BY st.sort_order`, [bidId]
  );
  const additional = await biddingDb.queryAll<any>(
    `SELECT title, amount_cents FROM additional_work_orders WHERE bid_id = $1 AND owner_status = 'accepted'`, [bidId]
  );
  const txn = await biddingDb.queryOne<any>(
    'SELECT payment_method, transaction_reference, transaction_date FROM payment_transaction_records WHERE bid_id = $1', [bidId]
  );

  const contractTotalCents = breakdown.reduce((s, r) => s + Math.round(Number(r.line_total) * 100), 0)
    || Math.round(Number(bid.bid_amount) * 100);
  const additionalTotalCents = additional.reduce((s, a) => s + Number(a.amount_cents), 0);
  const grandTotalCents = contractTotalCents + additionalTotalCents;

  const number = nextReceiptNumber('CR');
  const issuerAddress = [contractorProfile.billing_address_line1, contractorProfile.billing_address_line2,
    `${contractorProfile.billing_city || ''}, ${contractorProfile.billing_state || ''} ${contractorProfile.billing_zip || ''}`].filter(Boolean).join(', ');

  const lineRows = breakdown.map(r =>
    `<tr><td>${escapeHtml(r.title || '')}<br><span class="muted">Labor $${Number(r.labor_cost).toFixed(2)} · Materials $${Number(r.materials_subtotal).toFixed(2)}</span></td><td style="text-align:right;">$${Number(r.line_total).toFixed(2)}</td></tr>`
  ).join('');
  const awoRows = additional.map(a =>
    `<tr><td>Additional work — ${escapeHtml(a.title)}</td><td style="text-align:right;">$${(Number(a.amount_cents)/100).toFixed(2)}</td></tr>`
  ).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${number}</title>
    <style>body{font-family:Inter,Arial,sans-serif;max-width:720px;margin:32px auto;padding:24px;color:#0f172a;}h1{font-size:22px;margin:0 0 4px;}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;}td,th{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left;}.muted{color:#64748b;font-size:12px;}.total{font-weight:700;font-size:16px;color:#059669;}</style></head><body>
    <h1>Final Payment Receipt</h1>
    <p class="muted">Receipt # ${number} · Issued ${new Date().toLocaleString()}</p>
    <h3 style="margin-top:24px;">From (Issuer)</h3>
    <p>${escapeHtml(contractorProfile.legal_company_name)}<br>${escapeHtml(issuerAddress)}<br>EIN: ${escapeHtml(contractorProfile.ein || '—')}<br>Phone: ${escapeHtml(contractorProfile.billing_phone || '')}</p>
    <h3 style="margin-top:24px;">To</h3>
    <p>${escapeHtml(`${owner?.first_name || ''} ${owner?.last_name || ''}`.trim())}<br>${escapeHtml(owner?.email || '')}</p>
    <h3 style="margin-top:24px;">For: ${escapeHtml(project?.title || '')}</h3>
    <table><thead><tr><th>Item</th><th style="text-align:right;">Amount</th></tr></thead><tbody>
      ${lineRows}
      ${awoRows}
    </tbody><tfoot>
      <tr><td style="text-align:right;">Contract subtotal</td><td style="text-align:right;">$${(contractTotalCents/100).toFixed(2)}</td></tr>
      <tr><td style="text-align:right;">Additional work</td><td style="text-align:right;">$${(additionalTotalCents/100).toFixed(2)}</td></tr>
      <tr><td class="total" style="text-align:right;">Grand total</td><td class="total" style="text-align:right;">$${(grandTotalCents/100).toFixed(2)}</td></tr>
    </tfoot></table>
    ${txn ? `<p class="muted" style="margin-top:16px;">Payment received via ${escapeHtml(txn.payment_method)} · Reference ${escapeHtml(txn.transaction_reference)} · ${new Date(txn.transaction_date).toLocaleDateString()}</p>` : ''}
    <p class="muted" style="margin-top:24px;">Generated via BidWork. The contractor's company named above is the legal seller for this transaction.</p>
    </body></html>`;

  const s3Key = `${process.env.S3_PREFIX || 'bidwork'}/receipts/contractor-payment/${bidId}/${number}.html`;
  await uploadHtml(s3Key, html);
  // Audit hash retained on the artifact (SHA-256 of bytes).
  createHash('sha256').update(html).digest('hex');

  return await biddingDb.queryOne<any>(
    `INSERT INTO contractor_payment_receipts (
       bid_id, project_id, owner_id, contractor_id, contract_total_cents, additional_work_total_cents, grand_total_cents,
       line_items, receipt_pdf_s3_key, receipt_number, issuer_legal_name, issuer_ein, issuer_billing_address,
       issuer_billing_phone, issuer_signature_s3_key
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      bidId, project.id, project.homeowner_id, bid.contractor_id,
      contractTotalCents, additionalTotalCents, grandTotalCents,
      JSON.stringify({ breakdown, additional }), s3Key, number,
      contractorProfile.legal_company_name, contractorProfile.ein || null, issuerAddress,
      contractorProfile.billing_phone || null, contractorProfile.signature_s3_key || null,
    ]
  );
}

export const receiptGenerator = { generateServiceFeeReceipt, generateContractorPaymentReceipt };
