import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getProjectStatus, approveProject, retryProject } from '../../services/projectApi';

export default function ScopeReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProject();
    const interval = setInterval(pollStatus, 4000);
    return () => clearInterval(interval);
  }, [id]);

  const loadProject = async () => {
    try {
      const result = await getProject(id!);
      if (result.success) {
        setProject(result.data.project);
        setTasks(result.data.tasks || []);
        setMedia(result.data.media || []);
        setStatus(result.data.project.scope_status);
      }
    } catch { setError('Failed to load project'); }
    finally { setLoading(false); }
  };

  const pollStatus = async () => {
    try {
      const result = await getProjectStatus(id!);
      if (result.success) {
        setStatus(result.data.scope_status);
        if (result.data.scope_status === 'complete') { loadProject(); }
      }
    } catch { /* silent poll failure */ }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const result = await approveProject(id!);
      if (result.success) navigate('/dashboard');
      else setError(result.error || 'Failed to approve');
    } catch { setError('Network error'); }
    finally { setApproving(false); }
  };

  const handleRetry = async () => {
    try {
      await retryProject(id!);
      setStatus('classifying');
      setError('');
    } catch { setError('Retry failed'); }
  };

  if (loading) return <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#64748b' }}>Loading project...</p></div>;

  const isProcessing = ['classifying', 'generating_scope', 'calculating_bids'].includes(status);
  const isFailed = status === 'failed';
  const isComplete = status === 'complete';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>&larr; Back to Dashboard</button>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{project?.title || 'Project'}</h1>
            <p style={{ fontSize: 14, color: '#64748b' }}>{project?.category} &middot; {project?.quality_tier} tier &middot; {project?.urgency}</p>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: isComplete ? '#ecfdf5' : isProcessing ? '#eff6ff' : '#fef2f2', color: isComplete ? '#059669' : isProcessing ? '#2563eb' : '#dc2626' }}>
            {isProcessing ? 'AI Processing...' : isFailed ? 'Failed' : isComplete ? 'Scope Ready' : status}
          </div>
        </div>

        {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

        {/* Processing State */}
        {isProcessing && (
          <div style={{ background: 'white', borderRadius: 16, padding: 48, border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>AI is analyzing your project</h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>
              {status === 'classifying' && 'Classifying your project type...'}
              {status === 'generating_scope' && 'Generating detailed scope of work...'}
              {status === 'calculating_bids' && 'Calculating bid range...'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {['classifying', 'generating_scope', 'calculating_bids'].map(s => (
                <div key={s} style={{ width: 40, height: 4, borderRadius: 2, background: status === s ? '#2563eb' : ['classifying', 'generating_scope', 'calculating_bids'].indexOf(status) > ['classifying', 'generating_scope', 'calculating_bids'].indexOf(s) ? '#2563eb' : '#e2e8f0' }} />
              ))}
            </div>
          </div>
        )}

        {/* Failed State */}
        {isFailed && (
          <div style={{ background: 'white', borderRadius: 16, padding: 48, border: '1px solid #fecaca', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Analysis failed</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Something went wrong. Your photos are safe — click retry to try again.</p>
            <button onClick={handleRetry} style={{ padding: '12px 28px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: '#2563eb' }}>Retry Analysis</button>
          </div>
        )}

        {/* Scope Ready */}
        {isComplete && (
          <>
            {/* Bid Range Summary */}
            {project?.bid_floor && (
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #4f46e5)', borderRadius: 16, padding: 32, marginBottom: 24, color: 'white' }}>
                <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginBottom: 8 }}>ESTIMATED BID RANGE</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                  <span style={{ fontSize: 36, fontWeight: 800 }}>${Number(project.bid_floor).toLocaleString()}</span>
                  <span style={{ fontSize: 18, opacity: 0.6 }}>to</span>
                  <span style={{ fontSize: 36, fontWeight: 800 }}>${Number(project.bid_ceiling).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 13, opacity: 0.6, marginTop: 8 }}>
                  {project.estimated_days_min}-{project.estimated_days_max} days estimated &middot; {tasks.length} tasks identified
                </p>
              </div>
            )}

            {/* Media Grid */}
            {media.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Project Media ({media.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {media.map((m: any) => {
                    const isVideo = m.media_type === 'video' || m.s3_key?.endsWith('.mp4') || m.s3_key?.endsWith('.mov') || m.mime_type?.startsWith('video/');
                    return (
                      <div key={m.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        {isVideo ? (
                          <video src={m.url} controls style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: '#000' }} />
                        ) : (
                          <img src={m.url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                        )}
                        <div style={{ padding: '8px 12px', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{isVideo ? '🎥' : '📷'}</span>
                          <span>{isVideo ? 'Video' : 'Photo'}</span>
                          {m.file_size_bytes && <span style={{ marginLeft: 'auto' }}>{(m.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Task List */}
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Scope of Work ({tasks.length} tasks)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {tasks.map((task: any, i: number) => {
                const totalMin = tasks.reduce((s: number, t: any) => s + Number(t.cost_min || 0), 0);
                const taskPercent = totalMin > 0 ? (Number(task.cost_min || 0) / totalMin * 100) : 0;
                const materials = (() => { try { return typeof task.materials === 'string' ? JSON.parse(task.materials) : task.materials; } catch { return []; } })();

                return (
                  <div key={task.id} style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>#{i + 1}</span>
                          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{task.title}</h4>
                        </div>
                        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{task.description}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>${Number(task.cost_min || 0).toLocaleString()} - ${Number(task.cost_max || 0).toLocaleString()}</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{task.labor_hours_min || 0}-{task.labor_hours_max || 0} hrs labor</p>
                      </div>
                    </div>

                    {/* Cost proportion bar */}
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, marginBottom: 12 }}>
                      <div style={{ height: '100%', width: `${Math.min(taskPercent, 100)}%`, background: 'linear-gradient(90deg, #2563eb, #7c3aed)', borderRadius: 2 }} />
                    </div>

                    {/* Details row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#64748b' }}>
                      {task.quantity && <span style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: 6 }}>📐 {task.quantity} {task.unit}</span>}
                      {Array.isArray(materials) && materials.length > 0 && (
                        <span style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: 6 }}>
                          🔧 {materials.map((m: any) => m.name || m).join(', ')}
                        </span>
                      )}
                      {task.ai_confidence && (
                        <span style={{ background: Number(task.ai_confidence) > 0.7 ? '#ecfdf5' : '#fefce8', padding: '4px 10px', borderRadius: 6, color: Number(task.ai_confidence) > 0.7 ? '#059669' : '#ca8a04' }}>
                          AI Confidence: {Math.round(Number(task.ai_confidence) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Approve Button */}
            {!project?.is_approved && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => navigate('/dashboard')} style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', background: 'white' }}>Save as Draft</button>
                <button onClick={handleApprove} disabled={approving}
                  style={{ flex: 2, padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: approving ? 'not-allowed' : 'pointer',
                    background: approving ? '#93c5fd' : 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {approving ? 'Approving...' : 'Approve & List for Bidding'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
