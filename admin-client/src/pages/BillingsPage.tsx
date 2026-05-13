import { useEffect, useState } from 'react';
import { getSubscriptionStats } from '../services/adminApi';
import SubscriptionsPage from './SubscriptionsPage';

interface SubStats {
  active?: number;
  trial?: number;
  expired?: number;
  total?: number;
  mrr?: number;
}

const statCard: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: 20,
  border: '1px solid #f1f5f9',
};

/**
 * Billings page — wraps the existing Subscriptions screen with a stats header
 * so the admin lands on a single billing-overview surface.
 */
export default function BillingsPage() {
  const [stats, setStats] = useState<SubStats>({});

  useEffect(() => {
    (async () => {
      try {
        const r = await getSubscriptionStats();
        if (r.success) setStats(r.data?.stats || r.data || {});
      } catch {
        // Stats are non-critical — silently fall back to empty card values.
      }
    })();
  }, []);

  const tiles: Array<{ label: string; value: string | number }> = [
    { label: 'Active Subscriptions', value: stats.active ?? 0 },
    { label: 'On Trial', value: stats.trial ?? 0 },
    { label: 'Expired', value: stats.expired ?? 0 },
    { label: 'Total', value: stats.total ?? 0 },
    { label: 'MRR', value: typeof stats.mrr === 'number' ? `$${stats.mrr.toLocaleString()}` : '—' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Billings</h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Subscriptions, plans and billing health.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {tiles.map(t => (
          <div key={t.label} style={statCard}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{t.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{t.value}</p>
          </div>
        ))}
      </div>

      <SubscriptionsPage />
    </div>
  );
}
