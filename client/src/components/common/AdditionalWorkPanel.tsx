import { useState, useEffect } from 'react';
import {
  listAdditionalWork, submitAdditionalWork, acceptAdditionalWork, rejectAdditionalWork,
} from '../../services/projectApi';

interface Props {
  bidId: string;
  viewerRole: 'contractor' | 'homeowner';
}

interface AwoRow {
  id: string;
  title: string;
  description: string | null;
  amount_cents: number;
  owner_status: 'pending' | 'accepted' | 'rejected';
  owner_response_notes: string | null;
  owner_signature_typed_name: string | null;
  owner_responded_at: string | null;
  contractor_submitted_at: string;
}

export default function AdditionalWorkPanel({ bidId, viewerRole }: Props) {
  const [items, setItems] = useState<AwoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contractor add form
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Owner accept/reject pending modal state
  const [respondTo, setRespondTo] = useState<{ awo: AwoRow; mode: 'accept' | 'reject' } | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => { load(); }, [bidId]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await listAdditionalWork(bidId);
      if (result.success) setItems(result.data.items || []);
      else setError(result.error || 'Failed to load');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    setError('');
    const amount = parseFloat(newAmount);
    if (!newTitle.trim()) { setError('Title is required'); return; }
    if (isNaN(amount) || amount <= 0) { setError('Amount must be positive'); return; }
    setSubmitting(true);
    try {
      const result = await submitAdditionalWork(bidId, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        amount_cents: Math.round(amount * 100),
      });
      if (result.success) {
        setShowAdd(false); setNewTitle(''); setNewDesc(''); setNewAmount('');
        load();
      } else setError(result.error || 'Failed to submit');
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleRespond = async () => {
    if (!respondTo) return;
    setError('');
    if (respondTo.mode === 'accept' && !signatureName.trim()) {
      setError('Type your full name as signature to accept'); return;
    }
    if (respondTo.mode === 'reject' && !responseNotes.trim()) {
      setError('A reason is required to reject'); return;
    }
    setResponding(true);
    try {
      const result = respondTo.mode === 'accept'
        ? await acceptAdditionalWork(bidId, respondTo.awo.id, {
            owner_signature_typed_name: signatureName.trim(),
            owner_response_notes: responseNotes.trim() || undefined,
          })
        : await rejectAdditionalWork(bidId, respondTo.awo.id, {
            owner_response_notes: responseNotes.trim(),
          });
      if (result.success) {
        setRespondTo(null); setSignatureName(''); setResponseNotes('');
        load();
      } else setError(result.error || 'Failed to respond');
    } catch { setError('Network error'); }
    finally { setResponding(false); }
  };

  const statusBadge = (status: AwoRow['owner_status']) => {
    const styles: Record<AwoRow['owner_status'], React.CSSProperties> = {
      pending: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
      accepted: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
      rejected: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    };
    return (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, ...styles[status] }}>
        {status}
      </span>
    );
  };

  const acceptedTotal = items
    .filter(i => i.owner_status === 'accepted')
    .reduce((sum, i) => sum + Number(i.amount_cents || 0), 0);
  const pendingCount = items.filter(i => i.owner_status === 'pending').length;

  return (
    <div style={{ background: '#fafbff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
          Additional Work {pendingCount > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginLeft: 6 }}>· {pendingCount} pending</span>}
        </h4>
        {viewerRole === 'contractor' && !showAdd && (
          <button onClick={() => setShowAdd(true)}
            style={{ fontSize: 12, fontWeight: 600, color: 'white', background: '#7c3aed', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
            + Add Extra Work
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
        Recorded for this engagement only. BidWork takes no fee on additional work — payments are between you and your {viewerRole === 'contractor' ? 'homeowner' : 'contractor'}.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{error}</div>
      )}

      {viewerRole === 'contractor' && showAdd && (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title (e.g. Replace shutoff valve)"
              style={{ padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 }} />
            <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Amount ($)"
              style={{ padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 }} />
          </div>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Why is this needed? (optional)"
            style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button onClick={() => { setShowAdd(false); setError(''); }} disabled={submitting}
              style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={submitting}
              style={{ fontSize: 12, fontWeight: 700, color: 'white', background: submitting ? '#a78bfa' : '#7c3aed', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 12 }}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 12 }}>No additional work logged.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(i => (
            <div key={i.id} style={{ background: 'white', borderRadius: 10, padding: 12, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{i.title}</p>
                    {statusBadge(i.owner_status)}
                  </div>
                  {i.description && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{i.description}</p>}
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>Submitted {new Date(i.contractor_submitted_at).toLocaleString()}</p>
                  {i.owner_status === 'accepted' && i.owner_signature_typed_name && (
                    <p style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>
                      Accepted by {i.owner_signature_typed_name} on {i.owner_responded_at && new Date(i.owner_responded_at).toLocaleDateString()}
                      {i.owner_response_notes && <> · {i.owner_response_notes}</>}
                    </p>
                  )}
                  {i.owner_status === 'rejected' && i.owner_response_notes && (
                    <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Reason: {i.owner_response_notes}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>${(i.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  {viewerRole === 'homeowner' && i.owner_status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={() => { setRespondTo({ awo: i, mode: 'accept' }); setSignatureName(''); setResponseNotes(''); setError(''); }}
                        style={{ fontSize: 11, fontWeight: 600, color: 'white', background: '#059669', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                        Accept
                      </button>
                      <button onClick={() => { setRespondTo({ awo: i, mode: 'reject' }); setSignatureName(''); setResponseNotes(''); setError(''); }}
                        style={{ fontSize: 11, fontWeight: 600, color: 'white', background: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: '8px 12px', background: '#eff6ff', borderRadius: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>Accepted additional work total</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1e3a8a' }}>${(acceptedTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Respond modal (homeowner only) */}
      {respondTo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 22, width: 'min(440px, 95vw)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              {respondTo.mode === 'accept' ? 'Accept additional work' : 'Reject additional work'}
            </h3>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
              "{respondTo.awo.title}" — ${(respondTo.awo.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>{error}</div>
            )}

            {respondTo.mode === 'accept' ? (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Type your full name as signature *</label>
                <input value={signatureName} onChange={e => setSignatureName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', marginBottom: 10 }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
                <textarea value={responseNotes} onChange={e => setResponseNotes(e.target.value)} rows={2}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', resize: 'vertical' }} />
              </>
            ) : (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Reason for rejection *</label>
                <textarea value={responseNotes} onChange={e => setResponseNotes(e.target.value)} rows={3}
                  placeholder="Explain why this additional work is not approved"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', resize: 'vertical' }} />
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setRespondTo(null); setError(''); }} disabled={responding}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleRespond} disabled={responding}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: 'white', border: 'none', borderRadius: 8,
                  cursor: responding ? 'not-allowed' : 'pointer',
                  background: responding ? '#93c5fd' : (respondTo.mode === 'accept' ? '#059669' : '#dc2626') }}>
                {responding ? 'Saving...' : respondTo.mode === 'accept' ? 'Accept' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
