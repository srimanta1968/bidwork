import { useState, useEffect } from 'react';
import { getPriceVariance, getPlatformUsage, getContractAllocation } from '../services/adminApi';

export default function AnalyticsPage() {
  const [priceVariance, setPriceVariance] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [allocation, setAllocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pvResult, usageResult, allocResult] = await Promise.all([getPriceVariance(), getPlatformUsage(), getContractAllocation()]);
      if (pvResult.success) setPriceVariance(pvResult.data.analytics || []);
      if (usageResult.success) setUsage(usageResult.data.usage || {});
      if (allocResult.success) setAllocation(allocResult.data.allocation || {});
    } catch {} finally { setLoading(false); }
  };

  if (loading) return <p style={{ color: '#64748b', padding: 24 }}>Loading analytics...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Platform Analytics</h1>

      {/* Platform Usage Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Total Users</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#2563eb' }}>{usage?.total_users || 0}</p>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Total Projects</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#7c3aed' }}>{usage?.total_projects || 0}</p>
        </div>
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Total Bids</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#059669' }}>{usage?.total_bids || 0}</p>
        </div>
      </div>

      {/* Contract Allocation */}
      {allocation && (
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Contract Allocation</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#64748b' }}>Total Bids</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{allocation.total_bids}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#64748b' }}>Accepted</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{allocation.accepted_bids}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#64748b' }}>Conversion Rate</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{allocation.conversion_rate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Price Variance by Category */}
      <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Price Variance by Category</h2>
        {priceVariance.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priceVariance.map((pv: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{pv.category || 'Uncategorized'}</span>
                <div style={{ display: 'flex', gap: 24 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Projects: {pv.project_count}</span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Avg AI: ${Number(pv.avg_ai_price || 0).toFixed(0)}</span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Avg Owner: ${Number(pv.avg_owner_price || 0).toFixed(0)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: Number(pv.avg_price_variance || 0) >= 0 ? '#059669' : '#dc2626' }}>
                    {Number(pv.avg_price_variance || 0) >= 0 ? '+' : ''}${Number(pv.avg_price_variance || 0).toFixed(0)} variance
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>No price variance data yet. Data appears once homeowners set custom prices.</p>
        )}
      </div>
    </div>
  );
}
