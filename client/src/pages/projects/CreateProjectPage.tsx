import { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, getPresignedUrls, confirmMedia, uploadFileToS3 } from '../../services/projectApi';

const CATEGORIES = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Exterior', 'Roofing', 'Landscaping', 'Painting', 'Flooring', 'Plumbing', 'Electrical', 'Deck/Patio', 'Garage', 'Basement', 'General Repair', 'Other'];

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [urgency, setUrgency] = useState('flexible');
  const [qualityTier, setQualityTier] = useState('standard');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    setFiles(prev => [...prev, ...validFiles].slice(0, 10));
  };

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleStep1 = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !category) { setError('Title and category are required'); return; }
    setError('');
    try {
      const result = await createProject({ title, description, location_address: location, urgency, quality_tier: qualityTier });
      if (result.success) { setProjectId(result.data.project_id); setStep(2); }
      else setError(result.error || 'Failed to create project');
    } catch { setError('Network error'); }
  };

  const handleUpload = async () => {
    if (files.length === 0) { setError('Please add at least one photo'); return; }
    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const filesMeta = files.map(f => ({ filename: f.name, content_type: f.type, media_type: f.type.startsWith('video/') ? 'video' : 'photo' }));
      const presignResult = await getPresignedUrls(projectId, filesMeta);
      if (!presignResult.success) { setError('Failed to get upload URLs'); setUploading(false); return; }

      const presigned = presignResult.data.presigned_urls;
      const mediaConfirm: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const ok = await uploadFileToS3(presigned[i].upload_url, files[i]);
        if (!ok) { setError(`Failed to upload ${files[i].name}`); setUploading(false); return; }
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        mediaConfirm.push({ s3_key: presigned[i].s3_key, media_type: presigned[i].media_type, file_size_bytes: files[i].size, mime_type: files[i].type });
      }

      const confirmResult = await confirmMedia(projectId, mediaConfirm);
      if (confirmResult.success) { setStep(3); }
      else setError('Failed to confirm uploads');
    } catch { setError('Upload failed'); }
    finally { setUploading(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', fontSize: 15, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#f8fafc' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>New Project</h1>
        <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24 }}>Upload photos and let AI scope your project.</p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {['Details', 'Upload', 'Processing'].map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 4, borderRadius: 2, background: step > i ? '#2563eb' : step === i + 1 ? '#93c5fd' : '#e2e8f0', marginBottom: 8, transition: 'background 0.3s' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: step >= i + 1 ? '#2563eb' : '#94a3b8' }}>{s}</span>
            </div>
          ))}
        </div>

        {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

        <div style={{ background: 'white', borderRadius: 16, padding: 36, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>

          {/* Step 1: Project Details */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Project Title *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Kitchen Remodel" style={inputStyle} required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Category *</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} required>
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what you want done..." style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Location</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>Urgency</label>
                  <select value={urgency} onChange={e => setUrgency(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="flexible">Flexible</option>
                    <option value="within_2_weeks">Within 2 Weeks</option>
                    <option value="asap">ASAP</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Quality Tier</label>
                  <select value={qualityTier} onChange={e => setQualityTier(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="budget">Budget</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>
              <button type="submit" style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                Continue to Upload
              </button>
            </form>
          )}

          {/* Step 2: Upload Photos */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Upload Photos & Videos</h2>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Add 3-10 photos of your project. The more you provide, the better the AI scope.</p>

              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#2563eb'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#e2e8f0'; handleFiles(e.dataTransfer.files); }}
                style={{ border: '2px dashed #e2e8f0', borderRadius: 14, padding: 40, textAlign: 'center', cursor: 'pointer', marginBottom: 20, transition: 'border-color 0.2s' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Click or drag to upload</p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>JPEG, PNG, MP4 — up to 10 files</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
              </div>

              {files.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 20 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '1' }}>
                      {f.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: 24 }}>🎥</div>
                      )}
                      <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: '20px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #2563eb, #7c3aed)', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' }}>Uploading... {uploadProgress}%</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', background: 'white' }}>Back</button>
                <button onClick={handleUpload} disabled={uploading || files.length === 0}
                  style={{ flex: 2, padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: uploading ? 'not-allowed' : 'pointer',
                    background: uploading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)', opacity: files.length === 0 ? 0.5 : 1 }}>
                  {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''} & Analyze`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI is analyzing your project</h2>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>This usually takes 30-60 seconds. We'll generate a detailed scope of work with cost estimates.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                {['Classifying', 'Generating Scope', 'Calculating Bids'].map((s, i) => (
                  <div key={s} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: '#f1f5f9', color: '#64748b' }}>{s}</div>
                ))}
              </div>
              <button onClick={() => navigate(`/projects/${projectId}`)}
                style={{ padding: '12px 28px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                View Project Status
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
