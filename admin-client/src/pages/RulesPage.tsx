import { useState, useEffect } from 'react';
import { getBidPriceRules, createBidPriceRule, updateBidPriceRule, deleteBidPriceRule } from '../services/adminApi';

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newPercentage, setNewPercentage] = useState('60');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    try { const r = await getBidPriceRules(); if (r.success) setRules(r.data.rules || []); } catch {}
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newPercentage) return;
    try {
      const r = await createBidPriceRule({ job_category: newCategory || undefined, min_price_percentage: Number(newPercentage) });
      if (r.success) { setShowNew(false); setNewCategory(''); setNewPercentage('60'); loadRules(); }
    } catch {}
  };

  const handleUpdate = async (ruleId: string) => {
    try {
      await updateBidPriceRule(ruleId, { min_price_percentage: Number(editValue) });
      setEditingId(null); loadRules();
    } catch {}
  };

  const handleDelete = async (ruleId: string) => {
    try { await deleteBidPriceRule(ruleId); loadRules(); } catch {}
  };

  const globalRule = rules.find(r => !r.job_category);
  const categoryRules = rules.filter(r => r.job_category);

  if (loading) return <p style={{ color: '#64748b', padding: 24 }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Bid Price Rule Engine</h1>
      {globalRule && (
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #4f46e5)', borderRadius: 14, padding: 24, marginBottom: 24, color: 'white' }}>
          <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>GLOBAL DEFAULT</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 800 }}>{globalRule.min_price_percentage}%</span>
            <span style={{ fontSize: 14, opacity: 0.7 }}>of AI-generated start price (minimum allowed)</span>
          </div>
          <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>Example: If AI price is $1,000, homeowner cannot set below ${(1000 * globalRule.min_price_percentage / 100).toFixed(0)}</p>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Category Overrides ({categoryRules.length})</h2>
        <button onClick={() => setShowNew(true)} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>+ Add Override</button>
      </div>
      {showNew && (
        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Category</label>
            <input placeholder="e.g., Plumbing" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Min %</label>
            <input type="number" min="1" max="100" value={newPercentage} onChange={e => setNewPercentage(e.target.value)} style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleCreate} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', background: '#059669', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Add</button>
          <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', fontSize: 13, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categoryRules.map(r => (
          <div key={r.id} style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{r.job_category}</p>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>Since {new Date(r.effective_date).toLocaleDateString()}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {editingId === r.id ? (
                <>
                  <input type="number" min="1" max="100" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: 70, padding: '6px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, textAlign: 'center' }} />
                  <button onClick={() => handleUpdate(r.id)} style={{ fontSize: 12, fontWeight: 600, color: 'white', background: '#059669', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>Save</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>{r.min_price_percentage}%</span>
                  <button onClick={() => { setEditingId(r.id); setEditValue(String(r.min_price_percentage)); }} style={{ fontSize: 12, color: '#2563eb', background: '#eff6ff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(r.id)} style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
        {categoryRules.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>No category overrides. Global default applies to all categories.</p>}
      </div>
    </div>
  );
}
