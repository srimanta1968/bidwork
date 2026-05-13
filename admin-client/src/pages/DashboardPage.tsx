import { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/adminApi';

interface Stats {
  users?: { homeowner?: number; contractor?: number; skilled_labor?: number; admin?: number };
  subscriptions?: { active?: number; trial?: number; total?: number; mrr?: number };
  service_fee?: { percent?: number; effective_from?: string };
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #f1f5f9',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await getDashboardStats();
        if (active && r.success) setStats(r.data || {});
        else if (active) setError(r.error || 'Failed to load stats');
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load stats');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const users = stats.users || {};
  const subs = stats.subscriptions || {};
  const fee = stats.service_fee || {};
  const feePercent = typeof fee.percent === 'number' ? `${(fee.percent * 100).toFixed(2)}%` : '—';

  const kpis: Array<{ label: string; value: string | number; sub?: string }> = [
    { label: 'Homeowners', value: users.homeowner ?? 0 },
    { label: 'Contractors', value: users.contractor ?? 0 },
    { label: 'Skilled Labor', value: users.skilled_labor ?? 0 },
    { label: 'Active Subscriptions', value: subs.active ?? 0, sub: subs.trial != null ? `${subs.trial} on trial` : undefined },
    { label: 'MRR', value: typeof subs.mrr === 'number' ? `$${subs.mrr.toLocaleString()}` : '—' },
    { label: 'Service Fee', value: feePercent, sub: fee.effective_from ? `since ${new Date(fee.effective_from).toLocaleDateString()}` : undefined },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Dashboard</h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Platform KPIs at a glance.</p>

      {loading && <p style={{ color: '#64748b', padding: 16 }}>Loading…</p>}
      {error && <p style={{ color: '#dc2626', padding: 16 }}>{error}</p>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {kpis.map(k => (
            <div key={k.label} style={cardStyle}>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{k.value}</p>
              {k.sub && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{k.sub}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
