import { useState, useEffect } from 'react';
import { getBidWithBreakdown } from '../../services/projectApi';

interface Props { bidId: string }

interface MaterialRow {
  id: string;
  task_id: string;
  catalog_item_id: string;
  quantity: number;
  unit_price: number | string;
  total: number | string;
  catalog_item: {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
    specifications: string | null;
    image_url: string | null;
    image_download_url: string | null;
    unit_price: number | string | null;
  };
}

interface TaskLine {
  task_id: string;
  labor_cost: number | string;
  materials_subtotal: number | string;
  line_total: number | string;
  notes: string | null;
  materials: MaterialRow[];
}

/**
 * Owner-facing materials review. Renders the bid's task breakdown, the materials
 * each contractor attached per task as cards (thumbnail + name + brand + line total),
 * and opens a modal with full image + spec when an item is clicked.
 */
export default function BidMaterialsReview({ bidId }: Props) {
  const [breakdown, setBreakdown] = useState<TaskLine[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<MaterialRow | null>(null);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bidId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getBidWithBreakdown(bidId);
      if (r.success) {
        setBreakdown(r.data.bid?.task_breakdown || []);
        // Pull task titles from the breakdown rows where available, otherwise fall back to id.
        const titles: Record<string, string> = {};
        for (const line of (r.data.bid?.task_breakdown || []) as any[]) {
          titles[line.task_id] = line.task_title || line.title || `Task ${line.task_id.slice(0, 8)}`;
        }
        setTaskTitles(titles);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) return <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Loading bid materials...</p>;
  if (breakdown.length === 0) return null;

  return (
    <div style={{ background: '#fafbff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 16, marginTop: 12 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
        Bid breakdown by task — click any item to see image &amp; specs
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {breakdown.map(line => (
          <div key={line.task_id} style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{taskTitles[line.task_id] || 'Task'}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                ${Number(line.line_total).toFixed(2)}
                <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', marginLeft: 6 }}>
                  (labor ${Number(line.labor_cost).toFixed(2)} · materials ${Number(line.materials_subtotal).toFixed(2)})
                </span>
              </p>
            </div>
            {line.materials?.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Labor only — no materials attached.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {line.materials?.map(m => {
                  const ci = m.catalog_item || ({} as any);
                  const isExternalImg = !!ci.image_url && /^https?:\/\//i.test(ci.image_url);
                  const thumb = ci.image_download_url || (isExternalImg ? ci.image_url : null);
                  return (
                    <button key={m.id} onClick={() => setActiveItem(m)}
                      style={{ textAlign: 'left', cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 6, background: '#e2e8f0', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 18 }}>
                        {thumb ? <img src={thumb} alt={ci.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.name || 'Item'}</p>
                        <p style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.brand || ''}{ci.model ? ` · ${ci.model}` : ''}</p>
                        <p style={{ fontSize: 11, color: '#1e3a8a', fontWeight: 600 }}>{m.quantity} × ${Number(m.unit_price).toFixed(2)} = ${Number(m.total).toFixed(2)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {activeItem && <ItemDetailModal item={activeItem} onClose={() => setActiveItem(null)} />}
    </div>
  );
}

function ItemDetailModal({ item, onClose }: { item: MaterialRow; onClose: () => void }) {
  const ci = item.catalog_item;
  const isExternal = !!ci.image_url && /^https?:\/\//i.test(ci.image_url);
  const fullImage = ci.image_download_url || (isExternal ? ci.image_url : null);
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Material item</p>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{ci.name || 'Item'}</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {ci.brand || '—'}{ci.model ? ` · Model ${ci.model}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ fontSize: 26, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {fullImage ? (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'center' }}>
              <img src={fullImage} alt={ci.name || 'item'} style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8 }} />
              <p style={{ marginTop: 8, fontSize: 12 }}>
                <a href={fullImage} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Open full size ↗</a>
              </p>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 32, marginBottom: 16, textAlign: 'center', color: '#94a3b8' }}>
              <span style={{ fontSize: 40 }}>📦</span>
              <p style={{ fontSize: 13, marginTop: 8 }}>The contractor hasn't uploaded an image for this product.</p>
            </div>
          )}

          <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, fontSize: 14 }}>
            <Row label="Quantity">{item.quantity}</Row>
            <Row label="Unit price">${Number(item.unit_price).toFixed(2)}</Row>
            <Row label="Line total"><strong style={{ color: '#0f172a' }}>${Number(item.total).toFixed(2)}</strong></Row>
          </dl>

          {ci.specifications && (
            <>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 18, marginBottom: 6 }}>Specifications</h4>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ci.specifications}</p>
            </>
          )}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', fontSize: 13, fontWeight: 700, color: 'white', background: '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ color: '#64748b' }}>{label}</dt>
      <dd style={{ color: '#0f172a', margin: 0 }}>{children}</dd>
    </>
  );
}
