import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableProjects, submitBid } from '../../services/projectApi';
import { useAuth } from '../../context/AuthContext';

export default function AvailableJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    try {
      const result = await getAvailableProjects();
      if (result.success) setProjects(result.data.projects || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleSubmitBid = async () => {
    if (!selectedProject || !bidAmount || !estimatedDays) { setError('Bid amount and estimated days are required'); return; }
    const amount = parseFloat(bidAmount);
    if (amount < selectedProject.bid_floor || amount > selectedProject.bid_ceiling) {
      setError(`Bid must be between $${Number(selectedProject.bid_floor).toLocaleString()} and $${Number(selectedProject.bid_ceiling).toLocaleString()}`);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const result = await submitBid({
        project_id: selectedProject.id,
        bid_amount: amount,
        estimated_days: parseInt(estimatedDays),
        proposal_notes: proposalNotes,
        contractor_name: `${user?.first_name} ${user?.last_name}`,
      });
      if (result.success) {
        setSuccess('Bid submitted successfully!');
        setSelectedProject(null);
        setBidAmount('');
        setEstimatedDays('');
        setProposalNotes('');
        setTimeout(() => setSuccess(''), 3000);
      } else setError(result.error || 'Failed to submit bid');
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', fontSize: 15, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#f8fafc' };

  if (loading) return <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#64748b' }}>Loading jobs...</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>&larr; Dashboard</button>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>Available Jobs</h1>
          </div>
        </div>

        {success && <div style={{ padding: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#059669', fontSize: 14, marginBottom: 20 }}>{success}</div>}
        {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

        {projects.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 48, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>No jobs available right now</h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>Homeowners are scoping projects — check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {projects.map((p: any) => (
              <div key={p.id} style={{ background: 'white', borderRadius: 16, padding: 28, border: selectedProject?.id === p.id ? '2px solid #2563eb' : '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setSelectedProject(selectedProject?.id === p.id ? null : p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{p.title}</h3>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>{p.category}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>{p.description?.slice(0, 120) || 'No description'}{p.description?.length > 120 ? '...' : ''}</p>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#94a3b8' }}>
                      {p.location_address && <span>📍 {p.location_address}</span>}
                      <span>⏱️ {p.urgency}</span>
                      <span>⭐ {p.quality_tier}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>BID RANGE</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>${Number(p.bid_floor || 0).toLocaleString()}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>to ${Number(p.bid_ceiling || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Bid Form (expanded) */}
                {selectedProject?.id === p.id && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Submit Your Bid</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Bid Amount ($) *</label>
                        <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)}
                          min={p.bid_floor} max={p.bid_ceiling} step="0.01"
                          placeholder={`${p.bid_floor} - ${p.bid_ceiling}`} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Estimated Days *</label>
                        <input type="number" value={estimatedDays} onChange={e => setEstimatedDays(e.target.value)} min="1" placeholder="e.g. 5" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Proposal Notes</label>
                      <textarea value={proposalNotes} onChange={e => setProposalNotes(e.target.value)} placeholder="Why you're the best fit for this job..." style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }} />
                    </div>
                    <button onClick={handleSubmitBid} disabled={submitting}
                      style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: submitting ? 'not-allowed' : 'pointer',
                        background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                      {submitting ? 'Submitting...' : 'Submit Bid'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
