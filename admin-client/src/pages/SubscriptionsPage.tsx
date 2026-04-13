import { useState, useEffect } from 'react';
import { getSubscriptions, getSubscriptionPlans, createSubscriptionPlan } from '../services/adminApi';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', billing_cycle: 'monthly' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [subResult, planResult] = await Promise.all([getSubscriptions(), getSubscriptionPlans()]);
      if (subResult.success) setSubscriptions(subResult.data.subscriptions || []);
      if (planResult.success) setPlans(planResult.data.plans || []);
    } catch {} finally { setLoading(false); }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.price) return;
    try {
      const r = await createSubscriptionPlan({ name: newPlan.name, price: Number(newPlan.price), billing_cycle: newPlan.billing_cycle, features: [] });
      if (r.success) { setShowNewPlan(false); setNewPlan({ name: '', price: '', billing_cycle: 'monthly' }); loadData(); }
    } catch {}
  };

  if (loading) return <p style={{ color: '#64748b', padding: 24 }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Subscriptions</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Plans ({plans.length})</h2>
            <button onClick={() => setShowNewPlan(true)} style={{ fontSize: 13, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>+ New Plan</button>
          </div>
          {showNewPlan && (
            <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0', marginBottom: 12 }}>
              <input placeholder="Plan Name" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input placeholder="Price" type="number" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: e.target.value })} style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }} />
                <select value={newPlan.billing_cycle} onChange={e => setNewPlan({ ...newPlan, billing_cycle: e.target.value })} style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreatePlan} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', background: '#059669', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Create</button>
                <button onClick={() => setShowNewPlan(false)} style={{ padding: '8px 16px', fontSize: 13, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
          {plans.map(p => (
            <div key={p.id} style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{p.name}</p>
                <p style={{ fontSize: 13, color: '#64748b' }}>{p.billing_cycle}</p>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>${Number(p.price).toFixed(2)}</span>
            </div>
          ))}
          {plans.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>No plans yet.</p>}
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Active Subscriptions ({subscriptions.length})</h2>
          {subscriptions.map(s => (
            <div key={s.id} style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{s.plan_name}</p>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: s.status === 'active' ? '#ecfdf5' : '#fefce8', color: s.status === 'active' ? '#059669' : '#ca8a04' }}>{s.status}</span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>User: {s.user_id?.slice(0, 8)}... | ${Number(s.plan_price || 0).toFixed(2)}/mo</p>
            </div>
          ))}
          {subscriptions.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>No subscriptions yet.</p>}
        </div>
      </div>
    </div>
  );
}
