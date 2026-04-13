import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalogs, createCatalog, getCatalogItems, addCatalogItem, deleteCatalogItem } from '../../services/projectApi';

export default function CatalogPage() {
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogCategory, setNewCatalogCategory] = useState('');
  const [newItem, setNewItem] = useState({ name: '', brand: '', model: '', specifications: '', unit_price: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadCatalogs(); }, []);

  const loadCatalogs = async () => {
    try {
      const result = await getCatalogs();
      if (result.success) {
        setCatalogs(result.data.catalogs || []);
        if (result.data.catalogs?.length > 0 && !selectedCatalog) {
          setSelectedCatalog(result.data.catalogs[0].id);
          loadItems(result.data.catalogs[0].id);
        }
      }
    } catch { setError('Failed to load catalogs'); }
    finally { setLoading(false); }
  };

  const loadItems = async (catalogId: string) => {
    try {
      const result = await getCatalogItems(catalogId);
      if (result.success) setItems(result.data.items || []);
    } catch { /* silent */ }
  };

  const handleCreateCatalog = async () => {
    if (!newCatalogName || !newCatalogCategory) return;
    try {
      const result = await createCatalog({ job_category: newCatalogCategory, name: newCatalogName });
      if (result.success) {
        setShowNewCatalog(false);
        setNewCatalogName('');
        setNewCatalogCategory('');
        loadCatalogs();
      } else setError(result.error);
    } catch { setError('Failed to create catalog'); }
  };

  const handleAddItem = async () => {
    if (!selectedCatalog || !newItem.name) return;
    try {
      const result = await addCatalogItem(selectedCatalog, { ...newItem, unit_price: newItem.unit_price ? Number(newItem.unit_price) : undefined });
      if (result.success) {
        setShowNewItem(false);
        setNewItem({ name: '', brand: '', model: '', specifications: '', unit_price: '' });
        loadItems(selectedCatalog);
      } else setError(result.error);
    } catch { setError('Failed to add item'); }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteCatalogItem(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch { setError('Failed to delete'); }
  };

  const selectCatalog = (id: string) => {
    setSelectedCatalog(id);
    loadItems(id);
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading catalogs...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>My Product Catalogs</span>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Back</button>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Sidebar: Catalogs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Catalogs</h3>
              <button onClick={() => setShowNewCatalog(true)} style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ New</button>
            </div>

            {showNewCatalog && (
              <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                <input placeholder="Category (e.g., Plumbing)" value={newCatalogCategory} onChange={e => setNewCatalogCategory(e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 6, boxSizing: 'border-box' }} />
                <input placeholder="Catalog Name" value={newCatalogName} onChange={e => setNewCatalogName(e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleCreateCatalog} style={{ flex: 1, padding: '6px', fontSize: 12, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Create</button>
                  <button onClick={() => setShowNewCatalog(false)} style={{ flex: 1, padding: '6px', fontSize: 12, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {catalogs.map(c => (
              <div key={c.id} onClick={() => selectCatalog(c.id)}
                style={{ background: selectedCatalog === c.id ? '#eff6ff' : 'white', borderRadius: 10, padding: '12px 14px', border: `1px solid ${selectedCatalog === c.id ? '#bfdbfe' : '#f1f5f9'}`, cursor: 'pointer', marginBottom: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{c.name}</p>
                <p style={{ fontSize: 12, color: '#64748b' }}>{c.job_category}</p>
              </div>
            ))}

            {catalogs.length === 0 && !showNewCatalog && (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>No catalogs yet. Create one to start adding products.</p>
            )}
          </div>

          {/* Main: Items */}
          <div>
            {selectedCatalog ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Items ({items.length})</h2>
                  <button onClick={() => setShowNewItem(true)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer' }}>+ Add Item</button>
                </div>

                {showNewItem && (
                  <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <input placeholder="Item Name *" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} style={{ padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }} />
                      <input placeholder="Brand" value={newItem.brand} onChange={e => setNewItem({ ...newItem, brand: e.target.value })} style={{ padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }} />
                      <input placeholder="Model" value={newItem.model} onChange={e => setNewItem({ ...newItem, model: e.target.value })} style={{ padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }} />
                      <input placeholder="Unit Price ($)" type="number" value={newItem.unit_price} onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })} style={{ padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }} />
                    </div>
                    <textarea placeholder="Specifications" value={newItem.specifications} onChange={e => setNewItem({ ...newItem, specifications: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleAddItem} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, color: 'white', background: '#059669', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Add Item</button>
                      <button onClick={() => setShowNewItem(false)} style={{ padding: '8px 20px', fontSize: 13, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(item => (
                    <div key={item.id} style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{item.name}</p>
                        <p style={{ fontSize: 13, color: '#64748b' }}>
                          {item.brand && `${item.brand}`}{item.model && ` - ${item.model}`}
                          {item.specifications && ` | ${item.specifications.substring(0, 60)}...`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {item.unit_price && <span style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>${Number(item.unit_price).toFixed(2)}</span>}
                        <button onClick={() => handleDeleteItem(item.id)} style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 24 }}>No items yet. Add products to this catalog.</p>}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <p style={{ fontSize: 14, color: '#94a3b8' }}>Select or create a catalog to manage items.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
