import { useState, useEffect } from 'react';
import { listBidMessages, postBidMessage, markBidMessageRead } from '../../services/projectApi';

interface Props {
  bidId: string;
  viewerRole: 'homeowner' | 'contractor';
  currentUserId: string;
}

export default function BidMessagesPanel({ bidId, viewerRole, currentUserId }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [composer, setComposer] = useState('');
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    load();
    // Poll every 8s so the other party's new messages show up without a manual refresh.
    const handle = setInterval(load, 8000);
    return () => clearInterval(handle);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [bidId]);

  const load = async () => {
    try {
      const r = await listBidMessages(bidId);
      if (r.success) {
        const list = r.data.messages || [];
        // Skip the state update (and its re-render) when the count + last id are unchanged.
        setMessages(prev => {
          if (prev.length === list.length && prev[prev.length - 1]?.id === list[list.length - 1]?.id) return prev;
          return list;
        });
        // Mark anything that's not from me and not yet read as read.
        for (const m of list) {
          if (!m.read_at && m.sender_user_id !== currentUserId) {
            markBidMessageRead(bidId, m.id).catch(() => {});
          }
        }
      }
    } catch { /* silent */ }
  };

  const handlePost = async () => {
    setError('');
    if (!composer.trim()) return;
    setPosting(true);
    try {
      const r = await postBidMessage(bidId, composer.trim());
      if (r.success) { setComposer(''); load(); }
      else setError(r.error || 'Failed to send');
    } catch { setError('Network error'); }
    finally { setPosting(false); }
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginTop: 10 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Private Messages</h4>
      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
        Only you and the {viewerRole === 'homeowner' ? 'contractor' : 'homeowner'} on this bid can see this thread. Personal contact info is automatically removed.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', marginBottom: 10 }}>
        {messages.length === 0 && <p style={{ fontSize: 12, color: '#94a3b8' }}>No messages yet.</p>}
        {messages.map(m => {
          const isMe = m.sender_user_id === currentUserId;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '78%', background: isMe ? '#2563eb' : 'white', color: isMe ? 'white' : '#0f172a',
                border: isMe ? 'none' : '1px solid #e2e8f0', borderRadius: 10, padding: '8px 12px' }}>
                <p style={{ fontSize: 13, lineHeight: 1.4 }}>{m.sanitized_message}</p>
                <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                  {m.sender_role} · {new Date(m.created_at).toLocaleString()}
                  {isMe && m.read_at && <> · read</>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={composer} onChange={e => setComposer(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handlePost())}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 8 }} />
        <button onClick={handlePost} disabled={posting || !composer.trim()}
          style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'white', background: posting || !composer.trim() ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 8, cursor: posting || !composer.trim() ? 'not-allowed' : 'pointer' }}>
          Send
        </button>
      </div>
    </div>
  );
}
