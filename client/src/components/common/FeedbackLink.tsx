import { useEffect, useState } from 'react';
import { submitFeedback } from '../../services/projectApi';

interface Props {
  /** Where the user is when they click — gets stored with the row. */
  context?: 'general' | 'scope_review' | 'bid_review' | 'onboarding' | 'other';
  /** Optional project to associate (only on per-project surfaces). */
  projectId?: string;
  /** Override link label. */
  label?: string;
  /** Style of the trigger: 'link' (default) or 'button'. */
  variant?: 'link' | 'button';
}

/**
 * Globally-available "Send feedback" trigger. Any logged-in user role
 * (homeowner, contractor, skilled_labor, admin) can submit notes; the admin
 * portal reads them under Feedback.
 */
export default function FeedbackLink({ context = 'general', projectId, label = 'Send feedback', variant = 'link' }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const onSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    try {
      const r = await submitFeedback({ message: msg, context, project_id: projectId });
      if (r.success) {
        setToast({ kind: 'success', text: 'Thanks — feedback sent!' });
        setText('');
        setOpen(false);
      } else {
        setToast({ kind: 'error', text: r.error || 'Failed to send feedback' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Failed to send feedback' });
    } finally {
      setSending(false);
    }
  };

  const triggerStyle: React.CSSProperties = variant === 'button'
    ? { fontSize: 13, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }
    : { fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 };

  return (
    <>
      <button onClick={() => setOpen(true)} style={triggerStyle}>{label}</button>

      {open && (
        <div onClick={() => !sending && setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 14, width: 'min(540px, 92vw)', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Send feedback</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Tell us what's working, what's off, or what you'd like to see. We read every note.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={6} maxLength={2000} placeholder="Your feedback…"
              style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 10, marginBottom: 16, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setOpen(false)} disabled={sending}
                style={{ padding: '9px 18px', fontSize: 14, fontWeight: 600, color: '#475569', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={onSend} disabled={sending || !text.trim()}
                style={{ padding: '9px 18px', fontSize: 14, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 8,
                  cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !text.trim() ? 0.6 : 1 }}>
                {sending ? 'Sending…' : 'Send'}
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
    </>
  );
}
