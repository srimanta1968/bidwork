import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDraftProject, updateDraftProject, getPresignedUrls, uploadFileToS3, confirmMedia, deleteMedia } from '../../services/projectApi';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm'];

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [urgency, setUrgency] = useState('flexible');
  const [qualityTier, setQualityTier] = useState('standard');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadDraft(); }, [id]);

  const loadDraft = async () => {
    if (!id) return;
    try {
      const result = await getDraftProject(id);
      if (result.success) {
        const p = result.data.project;
        setProject(p);
        setMedia(result.data.media || []);
        setTitle(p.title || '');
        setDescription(p.description || '');
        setLocationAddress(p.location_address || '');
        setUrgency(p.urgency || 'flexible');
        setQualityTier(p.quality_tier || 'standard');
      } else { setError(result.error || 'Failed to load project'); }
    } catch { setError('Failed to load project'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      const result = await updateDraftProject(id, { title, description, location_address: locationAddress, urgency, quality_tier: qualityTier });
      if (!result.success) setError(result.error || 'Failed to save');
    } catch { setError('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleUploadFiles = async () => {
    if (!id || newFiles.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const filesMeta = newFiles.map(f => ({ filename: f.name, content_type: f.type, media_type: f.type.startsWith('image/') ? 'photo' : 'video' }));
      const presignResult = await getPresignedUrls(id, filesMeta);
      if (!presignResult.success) { setError('Failed to get upload URLs'); return; }

      const mediaRecords: any[] = [];
      for (let i = 0; i < presignResult.data.presigned_urls.length; i++) {
        const pu = presignResult.data.presigned_urls[i];
        const ok = await uploadFileToS3(pu.upload_url, newFiles[i]);
        if (ok) mediaRecords.push({ s3_key: pu.s3_key, media_type: pu.media_type, file_size_bytes: newFiles[i].size, mime_type: newFiles[i].type });
      }

      if (mediaRecords.length > 0) {
        await confirmMedia(id, mediaRecords);
        setNewFiles([]);
        await loadDraft();
      }
    } catch { setError('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!id) return;
    try {
      await deleteMedia(id, mediaId);
      setMedia(prev => prev.filter(m => m.id !== mediaId));
    } catch { setError('Failed to delete media'); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => ACCEPTED_TYPES.includes(f.type));
    setNewFiles(prev => [...prev, ...files].slice(0, 20));
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading draft...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Edit Project</span>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Back to Dashboard</button>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>Project Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Location Address</label>
            <input value={locationAddress} onChange={e => setLocationAddress(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Urgency</label>
              <select value={urgency} onChange={e => setUrgency(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8 }}>
                <option value="flexible">Flexible</option>
                <option value="within_2_weeks">Within 2 Weeks</option>
                <option value="asap">ASAP</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Quality Tier</label>
              <select value={qualityTier} onChange={e => setQualityTier(e.target.value)} style={{ width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8 }}>
                <option value="budget">Budget</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', background: '#2563eb', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Photos & Videos</h2>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Upload photos (JPEG, PNG, WebP) and/or videos (MP4, MOV, WebM) of your project.</p>

        {media.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
            {media.map((m: any) => (
              <div key={m.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '1' }}>
                {m.media_type === 'video' ? (
                  <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24 }}>🎬</div>
                ) : (
                  <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                )}
                <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 10, fontWeight: 600, color: 'white', background: m.media_type === 'photo' ? '#2563eb' : '#7c3aed', padding: '2px 6px', borderRadius: 4 }}>
                  {m.media_type}
                </span>
                <button onClick={() => handleDeleteMedia(m.id)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(220,38,38,0.85)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ border: '2px dashed #d1d5db', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16, background: '#fafafa' }}>
          <input type="file" multiple accept={ACCEPTED_TYPES.join(',')} onChange={handleFileSelect} style={{ display: 'none' }} id="file-upload" />
          <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📷 🎥</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>Click to add photos or videos</p>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>JPEG, PNG, WebP, MP4, MOV, WebM</p>
          </label>
        </div>

        {newFiles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{newFiles.length} file(s) ready to upload:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {newFiles.map((f, i) => (
                <span key={i} style={{ fontSize: 12, background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, color: '#475569' }}>
                  {f.type.startsWith('image/') ? '📷' : '🎥'} {f.name}
                </span>
              ))}
            </div>
            <button onClick={handleUploadFiles} disabled={uploading} style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Uploading...' : `Upload ${newFiles.length} file(s) & Analyze`}
            </button>
          </div>
        )}

        {(media.length > 0 || newFiles.length > 0) && (
          <div style={{ marginTop: 24, padding: 16, background: '#ecfdf5', borderRadius: 10, border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: 14, color: '#059669', fontWeight: 600 }}>
              {media.length} media file(s) uploaded. {media.filter(m => m.media_type === 'photo').length} photos, {media.filter(m => m.media_type === 'video').length} videos.
            </p>
            {project?.scope_status === 'complete' && (
              <button onClick={() => navigate(`/projects/${id}`)} style={{ marginTop: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: 'white', background: '#059669', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                View Scope & Review
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
