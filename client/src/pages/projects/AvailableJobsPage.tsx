import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableProjects, submitBid, submitQuestion, getProjectQuestions, getProject, getCatalogs, getCatalogItems } from '../../services/projectApi';
import { useAuth } from '../../context/AuthContext';

interface ScopeTaskLite {
  id: string;
  title: string;
  description?: string;
  effective_start_price?: number | string | null;
  cost_min?: number | string | null;
  cost_max?: number | string | null;
  material_cost_min?: number | string | null;
  material_cost_max?: number | string | null;
  labor_cost_min?: number | string | null;
  labor_cost_max?: number | string | null;
  /** When true the homeowner is supplying materials for this task — the
   *  contractor only quotes labor and the materials picker is hidden. */
  owner_supplied_materials?: boolean;
  photo_evidence_keys?: string[] | null;
}

interface BreakdownLine {
  task_id: string;
  labor_cost: string;
  notes: string;
}

interface MaterialLine {
  task_id: string;
  catalog_item_id: string;
  item_name: string;
  brand?: string;
  unit_price: number;
  quantity: number;
}

export default function AvailableJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [estimatedDays, setEstimatedDays] = useState('');
  const [proposalNotes, setProposalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [scopeTasks, setScopeTasks] = useState<ScopeTaskLite[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, BreakdownLine>>({});
  const [materials, setMaterials] = useState<MaterialLine[]>([]);
  const [pickerForTask, setPickerForTask] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [itemsByCatalog, setItemsByCatalog] = useState<Record<string, any[]>>({});

  useEffect(() => { loadJobs(); loadCatalogs(); }, []);

  const loadCatalogs = async () => {
    try {
      const r = await getCatalogs();
      if (r.success) setCatalogs(r.data.catalogs || []);
    } catch { /* silent */ }
  };

  const loadCatalogItemsLazy = async (catalogId: string) => {
    if (itemsByCatalog[catalogId]) return;
    try {
      const r = await getCatalogItems(catalogId);
      if (r.success) setItemsByCatalog(prev => ({ ...prev, [catalogId]: r.data.items || [] }));
    } catch { /* silent */ }
  };

  const addMaterial = (taskId: string, item: any) => {
    setMaterials(prev => {
      const existing = prev.find(m => m.task_id === taskId && m.catalog_item_id === item.id);
      if (existing) {
        return prev.map(m => m === existing ? { ...m, quantity: m.quantity + 1 } : m);
      }
      return [...prev, {
        task_id: taskId,
        catalog_item_id: item.id,
        item_name: item.name,
        brand: item.brand,
        unit_price: Number(item.unit_price || 0),
        quantity: 1,
      }];
    });
  };

  const updateMaterialQty = (idx: number, qty: number) => {
    if (qty <= 0) { setMaterials(prev => prev.filter((_, i) => i !== idx)); return; }
    setMaterials(prev => prev.map((m, i) => i === idx ? { ...m, quantity: qty } : m));
  };

  const updateMaterialPrice = (idx: number, price: number) => {
    setMaterials(prev => prev.map((m, i) => i === idx ? { ...m, unit_price: Math.max(0, price) } : m));
  };

  const removeMaterial = (idx: number) => setMaterials(prev => prev.filter((_, i) => i !== idx));

  const materialsForTask = (taskId: string) => materials.filter(m => m.task_id === taskId);
  const materialsTotalForTask = (taskId: string) =>
    materialsForTask(taskId).reduce((s, m) => s + m.unit_price * m.quantity, 0);

  const loadJobs = async () => {
    try {
      const result = await getAvailableProjects();
      if (result.success) setProjects(result.data.projects || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const loadScopeTasks = async (projectId: string) => {
    try {
      const result = await getProject(projectId);
      if (result.success) {
        const tasks = (result.data.tasks || []) as ScopeTaskLite[];
        setScopeTasks(tasks);
        const initial: Record<string, BreakdownLine> = {};
        tasks.forEach(t => { initial[t.id] = { task_id: t.id, labor_cost: '', notes: '' }; });
        setBreakdown(initial);
      } else {
        setScopeTasks([]);
        setBreakdown({});
      }
    } catch {
      setScopeTasks([]);
      setBreakdown({});
    }
  };

  const totalBidAmount = (): number =>
    Object.values(breakdown).reduce((sum, l) => sum + (parseFloat(l.labor_cost) || 0), 0);

  const floorFor = (t: ScopeTaskLite): number =>
    Number(t.effective_start_price ?? t.cost_min ?? 0) || 0;

  const handleSubmitBid = async () => {
    if (!selectedProject || !estimatedDays) { setError('Estimated days is required'); return; }

    let payload: any = {
      project_id: selectedProject.id,
      estimated_days: parseInt(estimatedDays),
      proposal_notes: proposalNotes,
      contractor_name: `${user?.first_name} ${user?.last_name}`,
    };

    if (scopeTasks.length > 0) {
      const lines = Object.values(breakdown).filter(l => l.labor_cost !== '');
      if (lines.length === 0) { setError('Enter labor cost for at least one task'); return; }
      // Per-task floor validation client-side
      for (const t of scopeTasks) {
        const line = breakdown[t.id];
        if (!line || line.labor_cost === '') continue;
        const labor = parseFloat(line.labor_cost);
        if (isNaN(labor) || labor < 0) { setError(`Invalid labor cost for "${t.title}"`); return; }
        const floor = floorFor(t);
        if (labor < floor) { setError(`"${t.title}" labor must be at least $${floor.toLocaleString()}`); return; }
      }
      payload.task_breakdown = lines.map(l => ({
        task_id: l.task_id,
        labor_cost: parseFloat(l.labor_cost),
        notes: l.notes || undefined,
      }));
      // Strip materials lines for any task where the homeowner is supplying
      // them — the bid breakdown's materials_subtotal must be $0 for those
      // tasks regardless of what's in component state. Defense in depth: the
      // UI already hides the picker, but state could be stale.
      const ownerSuppliedTaskIds = new Set(
        scopeTasks.filter(t => t.owner_supplied_materials).map(t => t.id)
      );
      const effectiveMaterials = materials.filter(m => !ownerSuppliedTaskIds.has(m.task_id));
      if (effectiveMaterials.length > 0) {
        const bad = effectiveMaterials.find(m => !(m.quantity > 0) || !(m.unit_price > 0));
        if (bad) {
          setError(`Set a quantity and unit price for "${bad.item_name}" before submitting.`);
          return;
        }
        payload.material_list = effectiveMaterials.map(m => ({
          task_id: m.task_id,
          catalog_item_id: m.catalog_item_id,
          quantity: m.quantity,
          unit_price: m.unit_price,
        }));
      }
    } else {
      // Legacy fallback: single bid_amount when no scope tasks loaded
      const amt = totalBidAmount();
      if (amt < selectedProject.bid_floor || amt > selectedProject.bid_ceiling) {
        setError(`Bid must be between $${Number(selectedProject.bid_floor).toLocaleString()} and $${Number(selectedProject.bid_ceiling).toLocaleString()}`);
        return;
      }
      payload.bid_amount = amt;
    }

    setError('');
    setSubmitting(true);
    try {
      const result = await submitBid(payload);
      if (result.success) {
        setSuccess('Bid submitted successfully!');
        setSelectedProject(null);
        setEstimatedDays('');
        setProposalNotes('');
        setBreakdown({});
        setScopeTasks([]);
        setMaterials([]);
        setTimeout(() => setSuccess(''), 3000);
      } else setError(result.error || 'Failed to submit bid');
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  const loadQuestions = async (projectId: string) => {
    try {
      const result = await getProjectQuestions(projectId);
      if (result.success) setQuestions(result.data.questions || []);
    } catch { /* silent */ }
  };

  const handleAskQuestion = async () => {
    if (!selectedProject || !newQuestion.trim()) return;
    setAskingQuestion(true);
    try {
      const result = await submitQuestion(selectedProject.id, newQuestion);
      if (result.success) { setNewQuestion(''); loadQuestions(selectedProject.id); }
      else setError(result.error || 'Failed to submit question');
    } catch { setError('Failed to submit question'); }
    finally { setAskingQuestion(false); }
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
                onClick={() => {
                  const isExpand = selectedProject?.id !== p.id;
                  setSelectedProject(isExpand ? p : null);
                  if (isExpand) { loadQuestions(p.id); loadScopeTasks(p.id); }
                  else { setScopeTasks([]); setBreakdown({}); }
                }}>
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

                    {scopeTasks.length > 0 ? (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                          Enter your labor cost per task. Each line must meet or exceed the start price floor for that task. Materials added later from your catalog will roll into the bid total automatically.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {scopeTasks.map(t => {
                            const line = breakdown[t.id] || { task_id: t.id, labor_cost: '', notes: '' };
                            const floor = floorFor(t);
                            const labor = parseFloat(line.labor_cost) || 0;
                            const belowFloor = line.labor_cost !== '' && labor < floor;
                            const ownerSupplies = !!t.owner_supplied_materials;
                            return (
                              <div key={t.id} style={{ background: '#f8fafc', border: belowFloor ? '1px solid #fca5a5' : '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    {/* Owner-Supplied badge is the only material/labor signal we surface
                                        to the contractor. The homeowner's AI cost ranges intentionally
                                        stay hidden here so the contractor isn't anchored to the AI
                                        number when pricing their own bid — they compete on labor
                                        rate, sourcing, and speed. */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t.title}</p>
                                      {ownerSupplies && (
                                        <span title="Homeowner is supplying materials for this task — only quote labor."
                                          style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 999, padding: '2px 8px' }}>
                                          Owner supplies materials
                                        </span>
                                      )}
                                    </div>
                                    {t.description && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{t.description.slice(0, 140)}{t.description.length > 140 ? '...' : ''}</p>}
                                  </div>
                                  <div style={{ marginLeft: 12, textAlign: 'right' }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>START PRICE</p>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>${floor.toLocaleString()}</p>
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Labor cost ($)</label>
                                    <input type="number" min={0} step="0.01" value={line.labor_cost}
                                      onChange={e => setBreakdown(prev => ({ ...prev, [t.id]: { ...line, labor_cost: e.target.value } }))}
                                      placeholder={`min ${floor}`} style={{ ...inputStyle, padding: '8px 12px', fontSize: 14 }} />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Notes (optional)</label>
                                    <input type="text" value={line.notes}
                                      onChange={e => setBreakdown(prev => ({ ...prev, [t.id]: { ...line, notes: e.target.value } }))}
                                      placeholder="Approach, materials, timing..." style={{ ...inputStyle, padding: '8px 12px', fontSize: 14 }} />
                                  </div>
                                </div>
                                {belowFloor && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>Labor must be at least ${floor.toLocaleString()}</p>}

                                {/* Attached materials for this task — hidden entirely when the
                                    homeowner is supplying materials. Contractor only quotes labor. */}
                                {ownerSupplies ? (
                                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #e2e8f0', fontSize: 12, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontWeight: 600 }}>✓ Homeowner supplies materials for this task.</span>
                                    <span style={{ color: '#64748b' }}>Bid labor only.</span>
                                  </div>
                                ) : (
                                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                                      Materials {materialsForTask(t.id).length > 0 && <>· ${materialsTotalForTask(t.id).toFixed(2)}</>}
                                    </span>
                                    <button type="button" onClick={() => setPickerForTask(t.id)}
                                      style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                                      + Attach Materials
                                    </button>
                                  </div>
                                  {materialsForTask(t.id).length === 0 ? (
                                    <p style={{ fontSize: 12, color: '#94a3b8' }}>Labor only — no materials attached.</p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {materials.map((m, idx) => {
                                        if (m.task_id !== t.id) return null;
                                        const lineTotal = m.quantity * m.unit_price;
                                        const priceMissing = m.unit_price <= 0;
                                        return (
                                          <div key={`${m.catalog_item_id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1e3a8a', background: '#eff6ff', border: priceMissing ? '1px solid #fca5a5' : '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px' }}>
                                            <span style={{ fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.item_name}</span>
                                            <label style={{ fontSize: 10, color: '#64748b' }}>qty</label>
                                            <input type="number" min={1} value={m.quantity}
                                              onChange={e => updateMaterialQty(idx, parseInt(e.target.value) || 0)}
                                              style={{ width: 48, padding: '3px 6px', fontSize: 12, border: '1px solid #bfdbfe', borderRadius: 4, textAlign: 'center' }} />
                                            <label style={{ fontSize: 10, color: '#64748b' }}>$/unit</label>
                                            <input type="number" min={0} step="0.01" value={m.unit_price || ''}
                                              placeholder="0.00"
                                              onChange={e => updateMaterialPrice(idx, parseFloat(e.target.value) || 0)}
                                              style={{ width: 72, padding: '3px 6px', fontSize: 12, border: priceMissing ? '1px solid #fca5a5' : '1px solid #bfdbfe', borderRadius: 4, textAlign: 'right' }} />
                                            <span style={{ fontWeight: 700 }}>= ${lineTotal.toFixed(2)}</span>
                                            <button type="button" onClick={() => removeMaterial(idx)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 14, cursor: 'pointer', padding: '0 4px' }}>×</button>
                                          </div>
                                        );
                                      })}
                                      {materialsForTask(t.id).some(m => m.unit_price <= 0) && (
                                        <p style={{ fontSize: 11, color: '#dc2626' }}>Set a unit price for highlighted items before submitting — your bid total depends on it.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: 12, padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Calculated bid total (labor)</span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a' }}>${totalBidAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Loading task breakdown...</p>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Estimated Days *</label>
                      <input type="number" value={estimatedDays} onChange={e => setEstimatedDays(e.target.value)} min="1" placeholder="e.g. 5" style={inputStyle} />
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

                    {/* Q&A Section */}
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Questions & Answers</h4>
                      <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 12 }}>
                        Do not share personal contact info, email, phone, or links. AI will automatically remove such content.
                      </div>

                      {questions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          {questions.map((q: any) => (
                            <div key={q.id} style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #f1f5f9' }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Q: {q.sanitized_question}</p>
                              {q.answer ? (
                                <p style={{ fontSize: 13, color: '#059669', marginLeft: 16 }}>A: {q.answer}</p>
                              ) : (
                                <p style={{ fontSize: 12, color: '#94a3b8', marginLeft: 16, fontStyle: 'italic' }}>Awaiting homeowner reply...</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Ask a question about this project..."
                          style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none' }} />
                        <button onClick={handleAskQuestion} disabled={askingQuestion || !newQuestion.trim()}
                          style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, color: 'white', background: '#7c3aed', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: askingQuestion ? 0.6 : 1 }}>
                          {askingQuestion ? '...' : 'Ask'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Materials picker drawer */}
      {pickerForTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setPickerForTask(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 'min(420px, 95vw)', height: '100%', background: 'white', overflow: 'auto', boxShadow: '-8px 0 24px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attach materials</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {scopeTasks.find(t => t.id === pickerForTask)?.title}
                </p>
              </div>
              <button onClick={() => setPickerForTask(null)} style={{ fontSize: 22, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 16 }}>
              {catalogs.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                  You haven't created any catalogs yet. <a href="/catalogs" style={{ color: '#2563eb' }}>Build one</a> with photos, brands, and prices, then attach items here.
                </p>
              ) : catalogs.map(c => (
                <details key={c.id} open style={{ marginBottom: 12 }}>
                  <summary onClick={() => loadCatalogItemsLazy(c.id)} style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0f172a', padding: '8px 0' }}>
                    {c.name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {c.job_category}</span>
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                    {!itemsByCatalog[c.id] && <p style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>Loading items...</p>}
                    {itemsByCatalog[c.id]?.length === 0 && <p style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>No items in this catalog yet.</p>}
                    {itemsByCatalog[c.id]?.map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: '#e2e8f0', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
                          {(() => {
                            const isExternal = item.image_url && /^https?:\/\//i.test(item.image_url);
                            const thumb = item.image_download_url || (isExternal ? item.image_url : null);
                            return thumb ? <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦';
                          })()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                          <p style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.brand}{item.model ? ` · ${item.model}` : ''}
                            {item.unit_price ? ` · $${Number(item.unit_price).toFixed(2)}` : (
                              <span style={{ color: '#dc2626', fontWeight: 600 }}> · set price after adding</span>
                            )}
                          </p>
                        </div>
                        <button onClick={() => addMaterial(pickerForTask, item)}
                          style={{ fontSize: 11, fontWeight: 700, color: 'white', background: '#7c3aed', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
