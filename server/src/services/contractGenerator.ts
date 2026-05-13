import { createHash } from 'crypto';
import { biddingDb, projectDb, authDb } from './domainDb';
import { s3Service } from './s3Service';

/**
 * Contract document generator. Renders an HTML "work order" with project +
 * scope + bid breakdown + signature blocks, hashes the bytes for audit, and
 * uploads to S3 under contracts/<bid_id>/v<version>/draft.html.
 *
 * After both parties sign, generateSignedContract() renders a finalized
 * version with both signatures, the BidWork verification stamp, and the
 * reference number, then stores it as signed.html under the same prefix.
 *
 * NOTE: Production should swap the HTML output for a PDF (Puppeteer or
 * wkhtmltopdf). The S3 key naming and the rest of the pipeline is identical
 * — only the bytes change.
 */

function buildReferenceNumber(opts: { bidId: string; projectId: string; contractId?: string; version: number }): string {
  // Short, human-readable ref. Includes project + bid short forms so each side
  // sees a number that ties back to the job (project) and the specific bid.
  const projShort = opts.projectId.replace(/-/g, '').slice(0, 6).toUpperCase();
  const bidShort = opts.bidId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `BW-${projShort}-${bidShort}-V${opts.version}`;
}

function instructionsHtml(): string {
  return [
    '<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:14px;margin:0 0 18px;">',
    '<p style="margin:0 0 6px;font-weight:700;color:#9a3412;font-size:13px;">Digital Signing Instructions</p>',
    '<p style="margin:0;color:#7c2d12;font-size:13px;line-height:1.5;">',
    'Both the <strong>Homeowner</strong> and the <strong>Contractor</strong> must sign this Work Order digitally to accept and proceed. ',
    'Each party types their full legal name in their respective signature block on the BidWork dashboard. ',
    'Once both signatures are recorded, BidWork applies a verification stamp with a unique reference number and timestamps, and a finalized work order is made available for both parties to download.',
    '</p>',
    '</div>',
  ].join('');
}

interface GeneratedDoc {
  contractId: string;
  s3Key: string;
  auditHash: string;
  version: number;
}

export async function generateContract(bidId: string): Promise<GeneratedDoc> {
  const bid = await biddingDb.queryOne<any>('SELECT * FROM bids WHERE id = $1', [bidId]);
  if (!bid) throw new Error('Bid not found');
  const project = await projectDb.queryOne<any>('SELECT * FROM projects WHERE id = $1', [bid.project_id]);
  if (!project) throw new Error('Project not found');
  const homeowner = await authDb.queryOne<any>('SELECT id, first_name, last_name FROM users WHERE id = $1', [project.homeowner_id]);
  const contractor = await authDb.queryOne<any>('SELECT id, first_name, last_name FROM users WHERE id = $1', [bid.contractor_id]);
  const contractorProfile = await authDb.queryOne<any>('SELECT business_name, license_number, category FROM contractor_profiles WHERE user_id = $1', [bid.contractor_id]);
  // Include owner_supplied_materials so the rendered workorder + contract can
  // clearly mark each task as Owner-Supplied or Contractor-Supplied — avoids
  // post-signature disputes about who pays for what.
  const tasks = await projectDb.queryAll<any>(
    `SELECT id, title, description, owner_supplied_materials
     FROM scope_tasks
     WHERE project_id = $1 AND is_removed = false
     ORDER BY sort_order`,
    [bid.project_id]
  );
  const breakdown = await biddingDb.queryAll<any>('SELECT task_id, labor_cost, materials_subtotal, line_total, notes FROM bid_task_breakdown WHERE bid_id = $1', [bidId]);
  const breakdownByTask = new Map(breakdown.map(b => [b.task_id, b]));

  const existing = await biddingDb.queryOne<{ id: string; version: number }>('SELECT id, version FROM contracts WHERE bid_id = $1', [bidId]);
  const version = existing ? existing.version + 1 : 1;
  const referenceNumber = buildReferenceNumber({ bidId, projectId: bid.project_id, version });

  const lines: string[] = [];
  lines.push('<!doctype html><html><head><meta charset="utf-8"><title>Work Order</title>');
  lines.push('<style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;max-width:780px;margin:32px auto;padding:24px;}h1{font-size:22px;margin:0 0 4px;}h2{font-size:15px;margin:24px 0 8px;color:#1e3a8a;}table{width:100%;border-collapse:collapse;font-size:13px;}td,th{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left;}tfoot td{font-weight:700;}.muted{color:#64748b;font-size:12px;}.refbox{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin:0 0 14px;font-size:12px;color:#334155;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}.refbox strong{color:#0f172a;font-size:13px;}.sigblock{margin-top:32px;display:flex;gap:24px;}.sigbox{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}</style></head><body>');
  lines.push('<h1>BidWork Work Order &amp; Contract</h1>');
  lines.push(`<p class="muted">Version ${version} · Generated ${new Date().toISOString()}</p>`);

  lines.push('<div class="refbox">');
  lines.push(`<span>Reference No: <strong>${escapeHtml(referenceNumber)}</strong></span>`);
  lines.push(`<span>Job ID: <strong>${escapeHtml(bid.project_id)}</strong></span>`);
  lines.push(`<span>Bid ID: <strong>${escapeHtml(bidId)}</strong></span>`);
  lines.push('</div>');

  lines.push(instructionsHtml());

  lines.push('<h2>Parties</h2>');
  lines.push('<table>');
  lines.push(`<tr><th>Homeowner</th><td>${escapeHtml(`${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim())}</td></tr>`);
  lines.push(`<tr><th>Contractor</th><td>${escapeHtml(`${contractor?.first_name || ''} ${contractor?.last_name || ''}`.trim())}${contractorProfile?.business_name ? ` (${escapeHtml(contractorProfile.business_name)})` : ''}${contractorProfile?.license_number ? ` · License ${escapeHtml(contractorProfile.license_number)}` : ''}</td></tr>`);
  lines.push('</table>');

  lines.push('<h2>Project</h2>');
  lines.push(`<p><strong>${escapeHtml(project.title || '')}</strong></p>`);
  if (project.description) lines.push(`<p>${escapeHtml(project.description)}</p>`);

  lines.push('<h2>Scope &amp; Pricing</h2>');
  // Materials column shows "— (owner supplied)" when the homeowner has opted to
  // supply materials for that task. Recorded on the contract itself so both
  // parties are clear on who is buying what before signing.
  lines.push('<table><thead><tr><th>Task</th><th>Materials supplier</th><th>Labor</th><th>Materials</th><th>Total</th></tr></thead><tbody>');
  for (const t of tasks) {
    const b = breakdownByTask.get(t.id);
    const labor = Number(b?.labor_cost ?? 0);
    const mats = Number(b?.materials_subtotal ?? 0);
    const total = Number(b?.line_total ?? labor + mats);
    const ownerSupplies = !!t.owner_supplied_materials;
    const supplierCell = ownerSupplies
      ? '<span style="color:#047857;font-weight:600;">Homeowner</span>'
      : 'Contractor';
    const matsCell = ownerSupplies
      ? '<span style="color:#64748b;">— (owner supplied)</span>'
      : `$${mats.toFixed(2)}`;
    lines.push(`<tr><td><strong>${escapeHtml(t.title || '')}</strong>${t.description ? `<br><span class="muted">${escapeHtml(t.description.slice(0, 240))}</span>` : ''}</td><td>${supplierCell}</td><td>$${labor.toFixed(2)}</td><td>${matsCell}</td><td>$${total.toFixed(2)}</td></tr>`);
  }
  lines.push(`</tbody><tfoot><tr><td colspan="4" style="text-align:right;">Total Contract Value</td><td>$${Number(bid.bid_amount || 0).toFixed(2)}</td></tr></tfoot></table>`);

  lines.push('<h2>Timeline</h2>');
  lines.push(`<p>Estimated completion: <strong>${bid.estimated_days || '—'} days</strong> from contract execution.</p>`);
  lines.push('<p style="font-size:12px;color:#7c2d12;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:8px 10px;"><strong>Note:</strong> The estimated completion above is preliminary. The <strong>actual start and end dates</strong> are proposed by the contractor and must be approved by the homeowner through BidWork. The homeowner\'s 5% platform deposit is due only <strong>after</strong> the schedule is approved by both parties; addresses are revealed once the deposit is paid.</p>');

  lines.push('<h2>Terms</h2>');
  lines.push('<ol style="font-size:13px;line-height:1.6;">');
  lines.push('<li>BidWork charges a platform service fee equal to the configured percentage of the contract value, collected as a deposit from the homeowner upon contract execution. This deposit converts to BidWork\'s admin fee once both parties have signed.</li>');
  lines.push('<li>Final payment for the work is settled directly between homeowner and contractor outside of BidWork. BidWork is not a party to that payment.</li>');
  lines.push('<li>Either party may add additional work to this engagement, but only with the other party\'s written acceptance recorded through BidWork.</li>');
  lines.push('<li><strong>Deposit non-refundability and credit transfer.</strong> The homeowner\'s 5% BidWork platform deposit is <strong>not refundable in cash</strong>. If the contractor abandons the workorder — including failing to visit and discuss the work after the homeowner has sent a reminder through BidWork — the homeowner may mark the workorder abandoned, in which case the deposit converts automatically into a credit applied to the next-ranked shortlisted bidder for the same project. The homeowner does not receive a cash refund under any circumstance.</li>');
  lines.push('<li><strong>Contractor reputation.</strong> Workorder abandonment is recorded against the contractor\'s public reputation on BidWork (visible to future homeowners alongside completion counts and ratings). After a workorder is completed, the contractor may request a 1-5 star rating from the homeowner; submitted ratings are aggregated and displayed on the contractor\'s future bids.</li>');
  lines.push(`<li>Jurisdiction: ${escapeHtml(process.env.CONTRACT_JURISDICTION || 'United States')}.</li>`);
  lines.push('</ol>');

  const homeownerName = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || '—';
  const contractorName = `${contractor?.first_name || ''} ${contractor?.last_name || ''}`.trim() || '—';

  lines.push('<div class="sigblock">');
  lines.push(`<div class="sigbox"><p class="muted">HOMEOWNER</p><p style="font-size:13px;margin:4px 0;"><strong>${escapeHtml(homeownerName)}</strong></p><p>Signature: <strong>__________________________</strong></p><p>Date: __________________</p><p class="muted" style="margin-top:6px;">Sign digitally on your BidWork dashboard.</p></div>`);
  lines.push(`<div class="sigbox"><p class="muted">CONTRACTOR</p><p style="font-size:13px;margin:4px 0;"><strong>${escapeHtml(contractorName)}</strong></p><p>Signature: <strong>__________________________</strong></p><p>Date: __________________</p><p class="muted" style="margin-top:6px;">Sign digitally on your BidWork dashboard.</p></div>`);
  lines.push('</div>');

  lines.push('</body></html>');
  const html = lines.join('\n');
  const auditHash = createHash('sha256').update(html).digest('hex');

  const s3Key = `${process.env.S3_PREFIX || 'bidwork'}/contracts/${bidId}/v${version}/draft.html`;
  const { url } = await s3Service.getPresignedUploadUrl(s3Key, 'text/html');
  await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'text/html' }, body: html });

  let contractId: string;
  if (existing) {
    await biddingDb.query(
      `UPDATE contracts SET version = $2, draft_pdf_s3_key = $3, status = 'draft',
                              audit_hash = $4, generated_at = NOW(), finalized_at = NULL,
                              signed_pdf_s3_key = NULL
        WHERE id = $1`,
      [existing.id, version, s3Key, auditHash]
    );
    contractId = existing.id;
  } else {
    const created = await biddingDb.queryOne<any>(
      `INSERT INTO contracts (bid_id, version, draft_pdf_s3_key, status, audit_hash)
       VALUES ($1,$2,$3,'draft',$4) RETURNING id`,
      [bidId, version, s3Key, auditHash]
    );
    contractId = created.id;
  }

  return { contractId, s3Key, auditHash, version };
}

/**
 * Generate the finalized signed work order, called from signContract once
 * both parties have a row in contract_signatures. Renders both signatures
 * inline (typed name + signed_at + ip), adds the BidWork verification stamp
 * with reference number + audit hash prefix, and uploads to
 * contracts/<bid_id>/v<version>/signed.html. Updates contracts.signed_pdf_s3_key.
 */
export async function generateSignedContract(bidId: string): Promise<GeneratedDoc | null> {
  const contract = await biddingDb.queryOne<any>('SELECT * FROM contracts WHERE bid_id = $1', [bidId]);
  if (!contract) return null;
  const signatures = await biddingDb.queryAll<any>('SELECT * FROM contract_signatures WHERE contract_id = $1 ORDER BY signed_at', [contract.id]);
  const ownerSig = signatures.find(s => s.signer_role === 'homeowner');
  const contractorSig = signatures.find(s => s.signer_role === 'contractor');
  if (!ownerSig || !contractorSig) return null;

  const bid = await biddingDb.queryOne<any>('SELECT * FROM bids WHERE id = $1', [bidId]);
  if (!bid) throw new Error('Bid not found');
  const project = await projectDb.queryOne<any>('SELECT * FROM projects WHERE id = $1', [bid.project_id]);
  if (!project) throw new Error('Project not found');
  const homeowner = await authDb.queryOne<any>('SELECT id, first_name, last_name FROM users WHERE id = $1', [project.homeowner_id]);
  const contractor = await authDb.queryOne<any>('SELECT id, first_name, last_name FROM users WHERE id = $1', [bid.contractor_id]);
  const contractorProfile = await authDb.queryOne<any>('SELECT business_name, license_number FROM contractor_profiles WHERE user_id = $1', [bid.contractor_id]);
  // Include owner_supplied_materials so the rendered workorder + contract can
  // clearly mark each task as Owner-Supplied or Contractor-Supplied — avoids
  // post-signature disputes about who pays for what.
  const tasks = await projectDb.queryAll<any>(
    `SELECT id, title, description, owner_supplied_materials
     FROM scope_tasks
     WHERE project_id = $1 AND is_removed = false
     ORDER BY sort_order`,
    [bid.project_id]
  );
  const breakdown = await biddingDb.queryAll<any>('SELECT task_id, labor_cost, materials_subtotal, line_total FROM bid_task_breakdown WHERE bid_id = $1', [bidId]);
  const breakdownByTask = new Map(breakdown.map(b => [b.task_id, b]));

  const referenceNumber = buildReferenceNumber({ bidId, projectId: bid.project_id, contractId: contract.id, version: contract.version });
  const finalizedAt = new Date().toISOString();
  const homeownerName = `${homeowner?.first_name || ''} ${homeowner?.last_name || ''}`.trim() || '—';
  const contractorName = `${contractor?.first_name || ''} ${contractor?.last_name || ''}`.trim() || '—';

  const lines: string[] = [];
  lines.push('<!doctype html><html><head><meta charset="utf-8"><title>Work Order — Signed</title>');
  lines.push('<style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;max-width:780px;margin:32px auto;padding:24px;}h1{font-size:22px;margin:0 0 4px;}h2{font-size:15px;margin:24px 0 8px;color:#1e3a8a;}table{width:100%;border-collapse:collapse;font-size:13px;}td,th{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left;}tfoot td{font-weight:700;}.muted{color:#64748b;font-size:12px;}.refbox{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:10px 12px;margin:0 0 14px;font-size:12px;color:#065f46;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}.refbox strong{color:#064e3b;font-size:13px;}.sigblock{margin-top:32px;display:flex;gap:24px;}.sigbox{flex:1;border:2px solid #059669;border-radius:8px;padding:14px;background:#ecfdf5;}.sigbox p{margin:3px 0;}.sigfont{font-family:"Brush Script MT","Lucida Handwriting",cursive;font-size:24px;color:#059669;font-weight:600;letter-spacing:0.5px;}.stampbox{margin-top:28px;border:2px dashed #2563eb;background:#eff6ff;border-radius:10px;padding:14px 16px;color:#1e3a8a;}.stampbox h3{margin:0 0 6px;font-size:14px;color:#1e3a8a;}.stampbox table{font-size:12px;}.stampbox td{border-bottom:1px solid #bfdbfe;padding:4px 6px;}.stamp-badge{display:inline-block;padding:6px 12px;border:2px solid #1d4ed8;border-radius:6px;background:white;color:#1d4ed8;font-weight:800;letter-spacing:1px;font-size:13px;transform:rotate(-2deg);margin-bottom:8px;}</style></head><body>');
  lines.push('<h1>BidWork Work Order &amp; Contract</h1>');
  lines.push(`<p class="muted">Version ${contract.version} · Finalized ${finalizedAt}</p>`);

  lines.push('<div class="refbox">');
  lines.push(`<span>Reference No: <strong>${escapeHtml(referenceNumber)}</strong></span>`);
  lines.push(`<span>Job ID: <strong>${escapeHtml(bid.project_id)}</strong></span>`);
  lines.push(`<span>Bid ID: <strong>${escapeHtml(bidId)}</strong></span>`);
  lines.push(`<span>Status: <strong>EXECUTED</strong></span>`);
  lines.push('</div>');

  lines.push('<h2>Parties</h2>');
  lines.push('<table>');
  lines.push(`<tr><th>Homeowner</th><td>${escapeHtml(homeownerName)}</td></tr>`);
  lines.push(`<tr><th>Contractor</th><td>${escapeHtml(contractorName)}${contractorProfile?.business_name ? ` (${escapeHtml(contractorProfile.business_name)})` : ''}${contractorProfile?.license_number ? ` · License ${escapeHtml(contractorProfile.license_number)}` : ''}</td></tr>`);
  lines.push('</table>');

  lines.push('<h2>Project</h2>');
  lines.push(`<p><strong>${escapeHtml(project.title || '')}</strong></p>`);
  if (project.description) lines.push(`<p>${escapeHtml(project.description)}</p>`);

  lines.push('<h2>Scope &amp; Pricing</h2>');
  // Materials column shows "— (owner supplied)" when the homeowner has opted to
  // supply materials for that task. Recorded on the contract itself so both
  // parties are clear on who is buying what before signing.
  lines.push('<table><thead><tr><th>Task</th><th>Materials supplier</th><th>Labor</th><th>Materials</th><th>Total</th></tr></thead><tbody>');
  for (const t of tasks) {
    const b = breakdownByTask.get(t.id);
    const labor = Number(b?.labor_cost ?? 0);
    const mats = Number(b?.materials_subtotal ?? 0);
    const total = Number(b?.line_total ?? labor + mats);
    const ownerSupplies = !!t.owner_supplied_materials;
    const supplierCell = ownerSupplies
      ? '<span style="color:#047857;font-weight:600;">Homeowner</span>'
      : 'Contractor';
    const matsCell = ownerSupplies
      ? '<span style="color:#64748b;">— (owner supplied)</span>'
      : `$${mats.toFixed(2)}`;
    lines.push(`<tr><td><strong>${escapeHtml(t.title || '')}</strong>${t.description ? `<br><span class="muted">${escapeHtml(t.description.slice(0, 240))}</span>` : ''}</td><td>${supplierCell}</td><td>$${labor.toFixed(2)}</td><td>${matsCell}</td><td>$${total.toFixed(2)}</td></tr>`);
  }
  lines.push(`</tbody><tfoot><tr><td colspan="4" style="text-align:right;">Total Contract Value</td><td>$${Number(bid.bid_amount || 0).toFixed(2)}</td></tr></tfoot></table>`);

  lines.push('<h2>Timeline</h2>');
  lines.push(`<p>Estimated completion: <strong>${bid.estimated_days || '—'} days</strong> from contract execution.</p>`);
  lines.push('<p style="font-size:12px;color:#7c2d12;background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:8px 10px;"><strong>Note:</strong> The estimated completion above is preliminary. The <strong>actual start and end dates</strong> are proposed by the contractor and must be approved by the homeowner through BidWork. The homeowner\'s 5% platform deposit is due only <strong>after</strong> the schedule is approved by both parties; addresses are revealed once the deposit is paid.</p>');

  lines.push('<h2>Terms</h2>');
  lines.push('<ol style="font-size:13px;line-height:1.6;">');
  lines.push('<li>BidWork charges a platform service fee equal to the configured percentage of the contract value, collected as a deposit from the homeowner upon contract execution. This deposit converts to BidWork\'s admin fee once both parties have signed.</li>');
  lines.push('<li>Final payment for the work is settled directly between homeowner and contractor outside of BidWork. BidWork is not a party to that payment.</li>');
  lines.push('<li>Either party may add additional work to this engagement, but only with the other party\'s written acceptance recorded through BidWork.</li>');
  lines.push('<li><strong>Deposit non-refundability and credit transfer.</strong> The homeowner\'s 5% BidWork platform deposit is <strong>not refundable in cash</strong>. If the contractor abandons the workorder — including failing to visit and discuss the work after the homeowner has sent a reminder through BidWork — the homeowner may mark the workorder abandoned, in which case the deposit converts automatically into a credit applied to the next-ranked shortlisted bidder for the same project. The homeowner does not receive a cash refund under any circumstance.</li>');
  lines.push('<li><strong>Contractor reputation.</strong> Workorder abandonment is recorded against the contractor\'s public reputation on BidWork (visible to future homeowners alongside completion counts and ratings). After a workorder is completed, the contractor may request a 1-5 star rating from the homeowner; submitted ratings are aggregated and displayed on the contractor\'s future bids.</li>');
  lines.push(`<li>Jurisdiction: ${escapeHtml(process.env.CONTRACT_JURISDICTION || 'United States')}.</li>`);
  lines.push('</ol>');

  lines.push('<h2>Signatures</h2>');
  lines.push('<div class="sigblock">');
  lines.push('<div class="sigbox">');
  lines.push('<p class="muted">HOMEOWNER</p>');
  lines.push(`<p style="font-size:13px;margin:4px 0;"><strong>${escapeHtml(homeownerName)}</strong></p>`);
  lines.push(`<p class="sigfont">${escapeHtml(ownerSig.typed_name || homeownerName)}</p>`);
  lines.push(`<p style="font-size:12px;">Signed (typed name): <strong>${escapeHtml(ownerSig.typed_name || '')}</strong></p>`);
  lines.push(`<p style="font-size:12px;">Date: <strong>${escapeHtml(new Date(ownerSig.signed_at).toISOString())}</strong></p>`);
  if (ownerSig.ip_address) lines.push(`<p class="muted">IP: ${escapeHtml(String(ownerSig.ip_address))}</p>`);
  lines.push(`<p class="muted">Reference: ${escapeHtml(referenceNumber)}</p>`);
  lines.push('<div class="stamp-badge">✓ BIDWORK VERIFIED</div>');
  lines.push('</div>');
  lines.push('<div class="sigbox">');
  lines.push('<p class="muted">CONTRACTOR</p>');
  lines.push(`<p style="font-size:13px;margin:4px 0;"><strong>${escapeHtml(contractorName)}</strong></p>`);
  lines.push(`<p class="sigfont">${escapeHtml(contractorSig.typed_name || contractorName)}</p>`);
  lines.push(`<p style="font-size:12px;">Signed (typed name): <strong>${escapeHtml(contractorSig.typed_name || '')}</strong></p>`);
  lines.push(`<p style="font-size:12px;">Date: <strong>${escapeHtml(new Date(contractorSig.signed_at).toISOString())}</strong></p>`);
  if (contractorSig.ip_address) lines.push(`<p class="muted">IP: ${escapeHtml(String(contractorSig.ip_address))}</p>`);
  lines.push(`<p class="muted">Reference: ${escapeHtml(referenceNumber)}</p>`);
  lines.push('<div class="stamp-badge">✓ BIDWORK VERIFIED</div>');
  lines.push('</div>');
  lines.push('</div>');

  lines.push('<div class="stampbox">');
  lines.push('<div class="stamp-badge">★ BIDWORK DIGITAL VERIFICATION STAMP ★</div>');
  lines.push('<h3>Document Verification</h3>');
  lines.push('<table>');
  lines.push(`<tr><th>Reference Number</th><td><strong>${escapeHtml(referenceNumber)}</strong></td></tr>`);
  lines.push(`<tr><th>Job ID</th><td>${escapeHtml(bid.project_id)}</td></tr>`);
  lines.push(`<tr><th>Bid ID</th><td>${escapeHtml(bidId)}</td></tr>`);
  lines.push(`<tr><th>Contract ID</th><td>${escapeHtml(contract.id)}</td></tr>`);
  lines.push(`<tr><th>Version</th><td>v${contract.version}</td></tr>`);
  lines.push(`<tr><th>Homeowner Signed At</th><td>${escapeHtml(new Date(ownerSig.signed_at).toISOString())}</td></tr>`);
  lines.push(`<tr><th>Contractor Signed At</th><td>${escapeHtml(new Date(contractorSig.signed_at).toISOString())}</td></tr>`);
  lines.push(`<tr><th>Finalized At</th><td>${escapeHtml(finalizedAt)}</td></tr>`);
  lines.push(`<tr><th>Draft Audit Hash</th><td style="font-family:monospace;font-size:11px;">${escapeHtml(String(contract.audit_hash || '').slice(0, 32))}…</td></tr>`);
  lines.push('</table>');
  lines.push('<p style="margin:8px 0 0;font-size:12px;">This document was digitally executed through BidWork. Both parties affirmed identity and acceptance via authenticated dashboard sessions. Tampering with this document invalidates the BidWork verification.</p>');
  lines.push('</div>');

  lines.push('</body></html>');
  const html = lines.join('\n');
  const auditHash = createHash('sha256').update(html).digest('hex');
  const s3Key = `${process.env.S3_PREFIX || 'bidwork'}/contracts/${bidId}/v${contract.version}/signed.html`;
  const { url } = await s3Service.getPresignedUploadUrl(s3Key, 'text/html');
  await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'text/html' }, body: html });

  await biddingDb.query(
    `UPDATE contracts SET signed_pdf_s3_key = $2, finalized_at = NOW() WHERE id = $1`,
    [contract.id, s3Key]
  );

  return { contractId: contract.id, s3Key, auditHash, version: contract.version };
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const contractGenerator = { generateContract, generateSignedContract };
