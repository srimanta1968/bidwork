import { useEffect, useState } from 'react';
import {
  listFeedback, setFeedbackStatus, summarizeFeedback, sendUserEmail,
  FeedbackRow, FeedbackStatus,
} from '../services/adminApi';

const STATUS_OPTIONS: Array<{ key: FeedbackStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'replied', label: 'Replied' },
];

const STATUS_COLORS: Record<FeedbackStatus, { bg: string; fg: string }> = {
  new:      { bg: '#eff6ff', fg: '#1d4ed8' },
  reviewed: { bg: '#fef3c7', fg: '#92400e' },
  replied:  { bg: '#ecfdf5', fg: '#047857' },
};

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function submitterName(r: FeedbackRow): string {
  const first = r.submitter_first_name || '';
  const last = r.submitter_last_name || '';
  const name = `${first} ${last}`.trim();
  return name || r.submitter_email || r.user_id.slice(0, 8);
}

export default function FeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{ text: string; model: string | null; count: number } | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const [replyTarget, setReplyTarget] = useState<FeedbackRow | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);

  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listFeedback(filter === 'all' ? {} : { status: filter });
      if (r.success) setRows(r.data?.rows || []);
      else setError(r.error || 'Failed to load feedback');
    } catch (e: any) {
      setError(e?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [filter]);

  const onSummarize = async () => {
    setSummarizing(true);
    setSummary(null);
    try {
      const r = await summarizeFeedback(filter === 'all' ? {} : { filter: { status: filter } });
      if (r.success) {
        setSummary({ text: r.data?.summary || '', model: r.data?.model || null, count: r.data?.count || 0 });
      } else {
        setToast({ kind: 'error', text: r.error || 'Summarize failed' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Summarize failed' });
    } finally {
      setSummarizing(false);
    }
  };

  const onMarkReviewed = async (row: FeedbackRow) => {
    const r = await setFeedbackStatus(row.id, 'reviewed');
    if (r.success) {
      setRows(prev => prev.map(x => x.id === row.id ? { ...x, status: 'reviewed' } : x));
      setToast({ kind: 'success', text: 'Marked as reviewed' });
    } else {
      setToast({ kind: 'error', text: r.error || 'Failed' });
    }
  };

  const openReply = (row: FeedbackRow) => {
    setReplyTarget(row);
    setReplySubject(`Re: your BidWork feedback`);
    setReplyBody('');
  };

  const sendReply = async () => {
    if (!replyTarget) return;
    if (!replySubject.trim() || !replyBody.trim()) return;
    setReplying(true);
    try {
      const r = await sendUserEmail(replyTarget.user_id, { subject: replySubject, body: replyBody });
      if (r.success) {
        await setFeedbackStatus(replyTarget.id, 'replied');
        setRows(prev => prev.map(x => x.id === replyTarget.id ? { ...x, status: 'replied' } : x));
        setToast({ kind: 'success', text: `Replied to ${replyTarget.submitter_email || submitterName(replyTarget)}` });
        setReplyTarget(null);
      } else {
        setToast({ kind: 'error', text: r.error || 'Failed to send email' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Failed to send email' });
    } finally {
      setReplying(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Feedback</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>Customer notes submitted via the in-app "Send feedback" links.</p>
        </div>
        <button onClick={onSummarize} disabled={summarizing}
          style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, color: 'white', background: '#4f46e5', border: 'none', borderRadius: 8, cursor: summarizing ? 'not-allowed' : 'pointer', opacity: summarizing ? 0.7 : 1 }}>
          {summarizing ? 'Summarizing…' : 'Summarize'}
        </button>
      </div>

      {summary && (
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>AI summary across {summary.count} note{summary.count === 1 ? '' : 's'}{summary.model ? ` · ${summary.model}` : ''}</p>
            <button onClick={() => setSummary(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>×</button>
          </div>
          <pre style={{ fontSize: 13, color: '#1e1b4b', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{summary.text}</pre>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STATUS_OPTIONS.map(o => (
          <button key={o.key} onClick={() => setFilter(o.key)}
            style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 999, cursor: 'pointer',
              background: filter === o.key ? '#2563eb' : '#f1f5f9', color: filter === o.key ? 'white' : '#475569' }}>
            {o.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#64748b', padding: 16 }}>Loading…</p>}
      {error && <p style={{ color: '#dc2626', padding: 16 }}>{error}</p>}

      {!loading && !error && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Submitter</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Context</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Message</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>When</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const colors = STATUS_COLORS[r.status] || STATUS_COLORS.new;
                const preview = r.message.length > 140 ? r.message.slice(0, 140) + '…' : r.message;
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      <p style={{ fontWeight: 600, color: '#0f172a' }}>{submitterName(r)}</p>
                      <p style={{ color: '#94a3b8', fontSize: 12 }}>{r.submitter_email || ''}</p>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{r.context}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#0f172a', maxWidth: 380 }}>{preview}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: colors.bg, color: colors.fg }}>{r.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmtDate(r.created_at)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.status === 'new' && (
                        <button onClick={() => onMarkReviewed(r)}
                          style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#fef3c7', color: '#92400e', marginRight: 8 }}>
                          Mark reviewed
                        </button>
                      )}
                      {r.submitter_email && (
                        <button onClick={() => openReply(r)}
                          style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#1d4ed8' }}>
                          Reply
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No feedback yet.</p>}
        </div>
      )}

      {replyTarget && (
        <div onClick={() => !replying && setReplyTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 14, width: 'min(560px, 92vw)', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Reply to feedback</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>To <strong>{submitterName(replyTarget)}</strong> · {replyTarget.submitter_email}</p>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>Subject</label>
            <input value={replySubject} onChange={e => setReplySubject(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 14, boxSizing: 'border-box' }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>Body</label>
            <textarea value={replyBody} onChange={e => setReplyBody(e.target.value)} rows={6}
              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 16, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 18, fontSize: 12, color: '#475569' }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Original feedback</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{replyTarget.message}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setReplyTarget(null)} disabled={replying}
                style={{ padding: '9px 18px', fontSize: 14, fontWeight: 600, color: '#475569', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={sendReply} disabled={replying || !replySubject.trim() || !replyBody.trim()}
                style={{ padding: '9px 18px', fontSize: 14, fontWeight: 600, color: 'white', background: '#4f46e5', border: 'none', borderRadius: 8,
                  cursor: replying || !replySubject.trim() || !replyBody.trim() ? 'not-allowed' : 'pointer',
                  opacity: replying || !replySubject.trim() || !replyBody.trim() ? 0.6 : 1 }}>
                {replying ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 10,
          background: toast.kind === 'success' ? '#ecfdf5' : '#fef2f2',
          color: toast.kind === 'success' ? '#047857' : '#b91c1c',
          border: `1px solid ${toast.kind === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: 14, fontWeight: 500, zIndex: 1000, maxWidth: 420,
        }}>{toast.text}</div>
      )}
    </div>
  );
}
