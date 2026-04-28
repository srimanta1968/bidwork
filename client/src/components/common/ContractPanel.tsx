import { useState, useEffect } from 'react';
import { acceptOffer, getContract, signContract, proposeSchedule, approveSchedule, rejectSchedule } from '../../services/projectApi';

interface Props {
  bidId: string;
  bidWorkflowState?: string;
  viewerRole: 'homeowner' | 'contractor';
  onChange?: () => void;
}

export default function ContractPanel({ bidId, bidWorkflowState, viewerRole, onChange }: Props) {
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bidId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getContract(bidId);
      if (r.success) setContract(r.data.contract);
      else setContract(null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleAccept = async () => {
    setError(''); setAccepting(true);
    try {
      const r = await acceptOffer(bidId);
      if (r.success) { await load(); onChange?.(); }
      else setError(r.error || 'Failed to accept offer');
    } catch { setError('Network error'); }
    finally { setAccepting(false); }
  };

  const handleSign = async () => {
    setError('');
    if (!agreed) { setError('You must confirm you agree to the terms'); return; }
    if (!typedName.trim()) { setError('Type your full name as signature'); return; }
    setSigning(true);
    try {
      const r = await signContract(bidId, typedName.trim());
      if (r.success) { setTypedName(''); setAgreed(false); await load(); onChange?.(); }
      else setError(r.error || 'Failed to sign');
    } catch { setError('Network error'); }
    finally { setSigning(false); }
  };

  // Only show the panel after the offer has been notified.
  if (!bidWorkflowState || bidWorkflowState === 'pending' || bidWorkflowState === 'shortlisted') return null;

  if (loading) return <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Loading contract...</p>;

  // Contractor sees Accept Offer when state is approved_by_owner and no contract yet.
  if (viewerRole === 'contractor' && bidWorkflowState === 'approved_by_owner' && !contract) {
    return (
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginTop: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Offer Awaiting Your Acceptance</h4>
        <p style={{ fontSize: 12, color: '#92400e', marginBottom: 10 }}>
          The homeowner selected your bid. Click Accept Offer within 72 working hours to generate the work order.
        </p>
        {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
        <button onClick={handleAccept} disabled={accepting}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: accepting ? '#fcd34d' : '#d97706', border: 'none', borderRadius: 8, cursor: accepting ? 'not-allowed' : 'pointer' }}>
          {accepting ? 'Generating contract...' : 'Accept Offer'}
        </button>
      </div>
    );
  }

  if (!contract) return null;

  const sigs: any[] = contract.signatures || [];
  const ownerSigned = sigs.some(s => s.signer_role === 'homeowner');
  const contractorSigned = sigs.some(s => s.signer_role === 'contractor');
  const mySig = viewerRole === 'homeowner' ? ownerSigned : contractorSigned;
  const otherSig = viewerRole === 'homeowner' ? contractorSigned : ownerSigned;

  return (
    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>Work Order Contract · v{contract.version}</h4>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
          background: contract.status === 'executed' ? '#ecfdf5' : '#fef3c7',
          color: contract.status === 'executed' ? '#059669' : '#92400e' }}>
          {contract.status === 'executed' ? 'Executed' : ownerSigned && contractorSigned ? 'Both signed' : ownerSigned ? 'Homeowner signed' : contractorSigned ? 'Contractor signed' : 'Awaiting signatures'}
        </span>
      </div>

      <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: '8px 12px', marginBottom: 10, color: '#7c2d12', fontSize: 12, lineHeight: 1.5 }}>
        <strong style={{ color: '#9a3412' }}>Digital signing required.</strong>{' '}
        Both the homeowner and the contractor must sign this Work Order digitally to accept it.
        Type your full legal name in the signature field below. Once both signatures are recorded,
        BidWork applies a verification stamp with a unique reference number and timestamps, and a
        finalized signed work order becomes available for both parties to download.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, marginBottom: 10 }}>
        {contract.draft_download_url && (
          <a href={contract.draft_download_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
            Download Draft Work Order ↗
          </a>
        )}
        {contract.signed_download_url && (
          <a href={contract.signed_download_url} target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: 700 }}>
            Download Signed Work Order (BidWork verified) ↗
          </a>
        )}
      </div>

      {!mySig ? (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
          {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
          <p style={{ fontSize: 12, color: '#1e3a8a', marginBottom: 6 }}>
            You are signing as the <strong>{viewerRole === 'homeowner' ? 'Homeowner' : 'Contractor'}</strong>. Type your full legal name exactly as it should appear on the finalized work order.
          </p>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Type your full name as signature</label>
          <input value={typedName} onChange={e => setTypedName(e.target.value)}
            placeholder={viewerRole === 'homeowner' ? 'e.g., Jane Q. Homeowner' : 'e.g., John Q. Contractor'}
            style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', marginBottom: 8 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', marginBottom: 8 }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            I have read and agree to the contract terms, and I authorize BidWork to record this typed name as my legally binding electronic signature.
          </label>
          <button onClick={handleSign} disabled={signing}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: signing ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 8, cursor: signing ? 'not-allowed' : 'pointer' }}>
            {signing ? 'Signing...' : `Sign digitally as ${viewerRole === 'homeowner' ? 'Homeowner' : 'Contractor'}`}
          </button>
        </div>
      ) : !otherSig ? (
        <p style={{ fontSize: 12, color: '#1e3a8a', background: '#dbeafe', borderRadius: 8, padding: '8px 12px' }}>
          You signed. Waiting for the {viewerRole === 'homeowner' ? 'contractor' : 'homeowner'} to sign.
        </p>
      ) : (
        <ScheduleStage contract={contract} viewerRole={viewerRole} bidId={bidId} onChange={() => { load(); onChange?.(); }} />
      )}
    </div>
  );
}

/**
 * Stage 3+: schedule submission (contractor) → approval (homeowner) → deposit gate.
 * Driven by contract.schedule_status: not_proposed | proposed | approved | rejected.
 */
function ScheduleStage({ contract, viewerRole, bidId, onChange }: { contract: any; viewerRole: 'homeowner' | 'contractor'; bidId: string; onChange: () => void }) {
  const status = contract.schedule_status as 'not_proposed' | 'proposed' | 'approved' | 'rejected';
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const todayIso = new Date().toISOString().slice(0, 10);
  const minEnd = start ? new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : todayIso;

  const onChangeStart = (v: string) => {
    setStart(v);
    if (end && v && new Date(end) <= new Date(v)) setEnd('');
  };

  const submit = async () => {
    setErr('');
    if (!start || !end) { setErr('Start and end dates are required'); return; }
    if (new Date(start) < new Date(todayIso)) { setErr('Start date cannot be in the past'); return; }
    if (new Date(end) <= new Date(start)) { setErr('End date must be after start date'); return; }
    setSubmitting(true);
    try {
      const r = await proposeSchedule(bidId, start, end);
      if (r.success) onChange();
      else setErr(r.error || 'Failed to submit schedule');
    } catch { setErr('Network error'); }
    finally { setSubmitting(false); }
  };

  const approve = async () => {
    setErr(''); setSubmitting(true);
    try {
      const r = await approveSchedule(bidId);
      if (r.success) onChange();
      else setErr(r.error || 'Failed to approve');
    } catch { setErr('Network error'); }
    finally { setSubmitting(false); }
  };

  const reject = async () => {
    setErr('');
    if (!rejectNotes.trim()) { setErr('Reason is required'); return; }
    setSubmitting(true);
    try {
      const r = await rejectSchedule(bidId, rejectNotes.trim());
      if (r.success) { setRejectMode(false); setRejectNotes(''); onChange(); }
      else setErr(r.error || 'Failed to reject');
    } catch { setErr('Network error'); }
    finally { setSubmitting(false); }
  };

  // Stage 3 — contractor submits schedule
  if ((status === 'not_proposed' || status === 'rejected') && viewerRole === 'contractor') {
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
          {status === 'rejected' ? 'Revise your schedule' : 'Propose your schedule'}
        </p>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
          {status === 'rejected'
            ? 'The homeowner asked for changes — see their note below, then submit a revised start and end date. They\'ll approve the new dates (or request further changes); the homeowner pays the 5% deposit only after approval.'
            : 'Tell the homeowner when you can start and finish. They\'ll approve or request changes; the homeowner pays the 5% deposit only after the schedule is approved.'}
        </p>
        {status === 'rejected' && contract.schedule_response_notes && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginBottom: 8 }}>
            <strong>Homeowner asked for changes:</strong> {contract.schedule_response_notes}
          </div>
        )}
        {err && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 2 }}>Start date</label>
            <input type="date" value={start} min={todayIso} onChange={e => onChangeStart(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 2 }}>End date</label>
            <input type="date" value={end} min={minEnd} disabled={!start} onChange={e => setEnd(e.target.value)}
              title={!start ? 'Pick a start date first' : undefined}
              style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, background: !start ? '#f1f5f9' : 'white', cursor: !start ? 'not-allowed' : 'auto' }} />
          </div>
        </div>
        <button onClick={submit} disabled={submitting}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: submitting ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {submitting ? 'Submitting...' : 'Submit Schedule'}
        </button>
      </div>
    );
  }

  // Stage 3 — homeowner waiting on contractor
  if (status === 'not_proposed' && viewerRole === 'homeowner') {
    return (
      <div style={{ background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Both parties signed — waiting for the schedule</p>
        <p style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.5, margin: 0 }}>
          Next step: the contractor will propose a start and end date. You'll then be able to <strong>approve the schedule</strong> or <strong>request changes</strong> here. Your 5% BidWork deposit is due <strong>only after</strong> the schedule is approved — please don't pay yet.
        </p>
      </div>
    );
  }

  // Stage 3 (rejected) — homeowner waiting on contractor to revise
  if (status === 'rejected' && viewerRole === 'homeowner') {
    return (
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Schedule sent back — waiting for revision</p>
        <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5, margin: 0 }}>
          You asked the contractor to revise the schedule{contract.schedule_response_notes ? <> (your note: <em>"{contract.schedule_response_notes}"</em>)</> : ''}. Once they submit a new schedule you'll be able to approve it here.
        </p>
      </div>
    );
  }

  // Stage 4 — homeowner reviews + approves/rejects
  if (status === 'proposed') {
    return (
      <div style={{ background: 'white', border: '1px solid #fde68a', borderRadius: 8, padding: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Schedule pending {viewerRole === 'homeowner' ? 'your' : "homeowner's"} approval</p>
        <p style={{ fontSize: 13, color: '#0f172a', marginBottom: 6 }}>
          Proposed: <strong>{contract.proposed_start_date}</strong> → <strong>{contract.proposed_end_date}</strong>
        </p>
        {viewerRole === 'homeowner' && (
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
            <strong>Approve</strong> if these dates work — you'll then be prompted to pay the 5% BidWork deposit on the next screen, and addresses reveal once paid. If the dates don't work, click <strong>Request changes</strong> to send the schedule back to the contractor with a note. <em>Don't pay the deposit until you approve the schedule.</em>
          </p>
        )}
        {err && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{err}</p>}
        {viewerRole === 'homeowner' && !rejectMode && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={approve} disabled={submitting}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: submitting ? '#86efac' : '#059669', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Approve schedule (deposit due next)
            </button>
            <button onClick={() => setRejectMode(true)} disabled={submitting}
              style={{ padding: '8px 14px', fontSize: 13, fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Request changes from contractor
            </button>
          </div>
        )}
        {viewerRole === 'homeowner' && rejectMode && (
          <div>
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={2}
              placeholder="What change do you need? (e.g., earlier start, longer window)"
              style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={reject} disabled={submitting}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Send back to contractor
              </button>
              <button onClick={() => { setRejectMode(false); setRejectNotes(''); }}
                style={{ padding: '6px 14px', fontSize: 12, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Stage 5 — schedule approved, deposit pending
  if (status === 'approved') {
    return (
      <p style={{ fontSize: 12, color: '#059669', background: '#ecfdf5', borderRadius: 8, padding: '8px 12px' }}>
        Schedule approved ({contract.proposed_start_date} → {contract.proposed_end_date}).{' '}
        {viewerRole === 'homeowner'
          ? 'Pay the 5% deposit below to start work and reveal addresses.'
          : 'Waiting for the homeowner to pay the deposit. Addresses reveal once paid.'}
      </p>
    );
  }
  return null;
}
