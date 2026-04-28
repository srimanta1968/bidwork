import { useState, useEffect } from 'react';
import {
  presignBidAttachment, finalizeBidAttachment, listBidAttachments, deleteBidAttachment, uploadFileToS3,
} from '../../services/projectApi';

interface Props {
  bidId: string;
  /** 'contractor' can upload + delete own; 'homeowner' is read-only download. */
  viewerRole: 'contractor' | 'homeowner';
}

const ALLOWED = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/jpg'];
const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;

export default function BidAttachmentsPanel({ bidId, viewerRole }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bidId]);

  const load = async () => {
    try {
      const r = await listBidAttachments(bidId);
      if (r.success) setItems(r.data.attachments || []);
    } catch { /* silent */ }
  };

  const handleUpload = async (file: File) => {
    setError('');
    if (!ALLOWED.includes(file.type)) { setError('Only PDF/DOC/DOCX/PNG/JPEG allowed'); return; }
    if (file.size > MAX_BYTES) { setError('Max 25 MB per file'); return; }
    if (items.length >= MAX_FILES) { setError(`Max ${MAX_FILES} attachments per bid`); return; }
    setUploading(true);
    try {
      const presign = await presignBidAttachment(bidId, file.name, file.type);
      if (!presign.success) { setError(presign.error || 'Failed to presign'); return; }
      const ok = await uploadFileToS3(presign.data.upload_url, file);
      if (!ok) { setError('Upload to S3 failed'); return; }
      const fin = await finalizeBidAttachment(bidId, {
        file_name: file.name, s3_key: presign.data.s3_key, mime_type: file.type, size_bytes: file.size,
      });
      if (!fin.success) { setError(fin.error || 'Failed to record attachment'); return; }
      load();
    } catch { setError('Network error'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      const r = await deleteBidAttachment(bidId, id);
      if (r.success) load();
      else setError(r.error || 'Failed to delete');
    } catch { setError('Network error'); }
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Attachments {items.length > 0 && <span style={{ color: '#64748b', fontWeight: 500 }}>· {items.length}/{MAX_FILES}</span>}</h4>
        {viewerRole === 'contractor' && (
          <label style={{ fontSize: 12, fontWeight: 600, color: 'white', background: uploading ? '#a78bfa' : '#7c3aed', padding: '6px 12px', borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploading ? 'Uploading...' : '+ Upload'}
            <input type="file" accept={ALLOWED.join(',')} disabled={uploading} style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
          </label>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: '#94a3b8' }}>No attachments yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid #f1f5f9', borderRadius: 8, padding: '8px 12px' }}>
              <a href={a.download_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
                {a.file_name}
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{Math.round(a.size_bytes / 1024)} KB</span>
                {viewerRole === 'contractor' && (
                  <button onClick={() => handleDelete(a.id)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
