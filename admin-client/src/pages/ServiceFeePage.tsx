import { useState, useEffect } from 'react';
import { getCurrentServiceFee, getServiceFeeHistory, setServiceFee } from '../services/adminApi';

const HIGH_FEE_WARN_PERCENT = 0.10;

function fmtPercent(decimal: number | string | null | undefined): string {
  if (decimal === null || decimal === undefined) return '—';
  const n = typeof decimal === 'string' ? parseFloat(decimal) : decimal;
  return `${(n * 100).toFixed(2)}%`;
}

export default function ServiceFeePage() {
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [percentInput, setPercentInput] = useState('');
  const [effectiveFromInput, setEffectiveFromInput] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmHigh, setConfirmHigh] = useState<{ percent: number } | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, h] = await Promise.all([getCurrentServiceFee(), getServiceFeeHistory()]);
      if (c.success) setCurrent(c.data?.current || null);
      if (h.success) setHistory(h.data?.history || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleSubmit = async (skipConfirm = false) => {
    setMsg(null);
    const pct = parseFloat(percentInput);
    if (isNaN(pct) || pct < 0 || pct > 0.5) {
      setMsg({ type: 'error', text: 'Percent must be a decimal between 0 and 0.5 (50% safety cap).' });
      return;
    }
    if (!skipConfirm && pct > HIGH_FEE_WARN_PERCENT) {
      setConfirmHigh({ percent: pct });
      return;
    }
    setConfirmHigh(null);
    setSaving(true);
    try {
      const result = await setServiceFee({
        percent: pct,
        effective_from: effectiveFromInput || undefined,
        notes: notes.trim() || undefined,
      });
      if (result.success) {
        setMsg({ type: 'success', text: `New service fee set: ${fmtPercent(pct)}` });
        setPercentInput(''); setEffectiveFromInput(''); setNotes('');
        loadAll();
      } else {
        setMsg({ type: 'error', text: result.error || 'Failed to update service fee' });
      }
    } catch { setMsg({ type: 'error', text: 'Network error' }); }
    finally { setSaving(false); }
  };

  if (loading) return <p style={{ color: '#64748b' }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Platform Service Fee</h1>

      {msg && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14,
          background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: msg.type === 'success' ? '#059669' : '#dc2626',
          border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}` }}>
          {msg.text}
        </div>
      )}

      {/* Current */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #4f46e5)', borderRadius: 14, padding: 24, marginBottom: 24, color: 'white' }}>
        <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>CURRENTLY EFFECTIVE</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 40, fontWeight: 800 }}>{fmtPercent(current?.percent)}</span>
          <span style={{ fontSize: 14, opacity: 0.7 }}>of contract value, charged as deposit at acceptance</span>
        </div>
        {current && (
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            Effective from {new Date(current.effective_from).toLocaleString()}
            {current.notes && <> &middot; {current.notes}</>}
          </p>
        )}
      </div>

      {/* New rate form */}
      <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Set New Rate</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Append-only versioned history. Historical bids retain the percent in effect when their deposit was collected.
          Default 5%. Values above 10% require confirmation.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>New Percent (decimal, e.g. 0.05)</label>
            <input type="number" step="0.0001" min="0" max="0.5" value={percentInput}
              onChange={e => setPercentInput(e.target.value)}
              placeholder="0.05"
              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Effective From (optional)</label>
            <input type="datetime-local" value={effectiveFromInput}
              onChange={e => setEffectiveFromInput(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Reason for change..."
            style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <button onClick={() => handleSubmit(false)} disabled={saving || !percentInput}
          style={{ marginTop: 16, padding: '10px 22px', fontSize: 14, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10,
            cursor: saving || !percentInput ? 'not-allowed' : 'pointer',
            background: saving || !percentInput ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
          {saving ? 'Saving...' : 'Save New Rate'}
        </button>
      </div>

      {/* History */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>History ({history.length})</h2>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Percent</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Effective From</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Set By</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.map(row => (
              <tr key={row.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{fmtPercent(row.percent)}</td>
                <td style={{ padding: '10px 14px', color: '#475569' }}>{new Date(row.effective_from).toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: '#475569' }}>{row.admin_email || 'system'}</td>
                <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{row.notes || '—'}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No history yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* High-fee confirmation modal */}
      {confirmHigh && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, width: 'min(440px, 95vw)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Confirm high fee rate</h3>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>
              You are setting the platform fee to <strong>{fmtPercent(confirmHigh.percent)}</strong>, which is above 10%. New bids' deposits will be charged at this rate from the chosen effective date forward. Continue?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmHigh(null)}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleSubmit(true)}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Yes, set rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
