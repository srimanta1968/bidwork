import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalogs, createCatalog, getCatalogItems, addCatalogItem, deleteCatalogItem, getCategories, presignCatalogItemImage, uploadFileToS3, updateCatalogItem } from '../../services/projectApi';

const IMAGE_MIME = 'image/png,image/jpeg,image/webp';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function uploadCatalogItemImage(itemId: string, file: File): Promise<{ ok: boolean; s3_key?: string; error?: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Max 5 MB per image' };
  const presign = await presignCatalogItemImage(itemId, file.name, file.type);
  if (!presign.success) return { ok: false, error: presign.error || 'Failed to presign' };
  const ok = await uploadFileToS3(presign.data.upload_url, file);
  if (!ok) return { ok: false, error: 'Upload to S3 failed' };
  return { ok: true, s3_key: presign.data.s3_key };
}

/**
 * The catalog item rows return image_url as either an external https URL or an
 * S3 key. The bid materials API resolves S3 keys to presigned download URLs;
 * for the catalog page we mirror that lightweight resolver client-side.
 */
function CatalogItemCard({ item, onDelete, onReplaceImage, onSaveEdit }: { item: any; onDelete: (id: string) => void; onReplaceImage: (id: string, file: File) => void; onSaveEdit: (id: string, patch: { name?: string; brand?: string; model?: string; unit_price?: number; specifications?: string }) => Promise<void> }) {
  const isExternal = !!item.image_url && /^https?:\/\//i.test(item.image_url);
  const thumb = item.image_download_url || (isExternal ? item.image_url : null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: item.name || '',
    brand: item.brand || '',
    model: item.model || '',
    unit_price: item.unit_price !== null && item.unit_price !== undefined ? String(item.unit_price) : '',
    specifications: item.specifications || '',
  });
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft({
      name: item.name || '',
      brand: item.brand || '',
      model: item.model || '',
      unit_price: item.unit_price !== null && item.unit_price !== undefined ? String(item.unit_price) : '',
      specifications: item.specifications || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: any = {};
      if (draft.name !== (item.name || '')) patch.name = draft.name;
      if (draft.brand !== (item.brand || '')) patch.brand = draft.brand;
      if (draft.model !== (item.model || '')) patch.model = draft.model;
      const priceTrimmed = draft.unit_price.trim();
      const newPrice = priceTrimmed === '' ? null : Number(priceTrimmed);
      const oldPrice = item.unit_price !== null && item.unit_price !== undefined ? Number(item.unit_price) : null;
      if (newPrice !== oldPrice) patch.unit_price = newPrice;
      if (draft.specifications !== (item.specifications || '')) patch.specifications = draft.specifications;
      if (Object.keys(patch).length > 0) await onSaveEdit(item.id, patch);
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 22 }}>
            {thumb ? <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
            <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Name *"
              style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 }} />
            <input value={draft.brand} onChange={e => setDraft(d => ({ ...d, brand: e.target.value }))} placeholder="Brand"
              style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 }} />
            <input value={draft.model} onChange={e => setDraft(d => ({ ...d, model: e.target.value }))} placeholder="Model"
              style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6 }} />
            <input type="number" min="0" step="0.01" value={draft.unit_price}
              onChange={e => setDraft(d => ({ ...d, unit_price: e.target.value }))} placeholder="Unit price ($)"
              style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, textAlign: 'right' }} />
          </div>
        </div>
        <textarea value={draft.specifications} onChange={e => setDraft(d => ({ ...d, specifications: e.target.value }))} rows={2}
          placeholder="Specifications" style={{ width: '100%', marginTop: 8, padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setEditing(false)} disabled={saving}
            style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !draft.name.trim()}
            style={{ fontSize: 12, fontWeight: 700, color: 'white', background: saving ? '#86efac' : '#059669', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 22 }}>
        {thumb ? <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{item.name}</p>
        <p style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.brand && `${item.brand}`}{item.model && ` · ${item.model}`}
          {item.specifications && ` · ${item.specifications.substring(0, 80)}${item.specifications.length > 80 ? '…' : ''}`}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {item.unit_price !== null && item.unit_price !== undefined && Number(item.unit_price) > 0 && (
          <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>${Number(item.unit_price).toFixed(2)}</span>
        )}
        <button onClick={startEdit}
          style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
          Edit
        </button>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
          {item.image_url ? 'Replace image' : 'Add image'}
          <input type="file" accept={IMAGE_MIME} style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onReplaceImage(item.id, f); e.target.value = ''; }} />
        </label>
        <button onClick={() => onDelete(item.id)} style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
      </div>
    </div>
  );
}

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
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [error, setError] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  useEffect(() => { loadCatalogs(); loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      if (result.success) {
        // Merge contractor + skilled_labor categories (user sees their role's categories)
        const all = [...(result.data.contractor || []), ...(result.data.skilled_labor || [])];
        setCategoryOptions([...new Set(all)].sort());
      }
    } catch {}
  };

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
    setError(''); setSavingItem(true);
    try {
      const result = await addCatalogItem(selectedCatalog, { ...newItem, unit_price: newItem.unit_price ? Number(newItem.unit_price) : undefined });
      if (!result.success) { setError(result.error || 'Failed to add item'); return; }

      // If a file was selected, upload to S3 and patch image_url onto the new item.
      if (newItemImage && result.data?.item?.id) {
        const up = await uploadCatalogItemImage(result.data.item.id, newItemImage);
        if (!up.ok) {
          setError(up.error || 'Item created but image upload failed');
        } else if (up.s3_key) {
          await updateCatalogItem(result.data.item.id, { image_url: up.s3_key });
        }
      }

      setShowNewItem(false);
      setNewItem({ name: '', brand: '', model: '', specifications: '', unit_price: '' });
      setNewItemImage(null);
      loadItems(selectedCatalog);
    } catch { setError('Failed to add item'); }
    finally { setSavingItem(false); }
  };

  const handleReplaceItemImage = async (itemId: string, file: File) => {
    setError('');
    const up = await uploadCatalogItemImage(itemId, file);
    if (!up.ok) { setError(up.error || 'Upload failed'); return; }
    if (up.s3_key) await updateCatalogItem(itemId, { image_url: up.s3_key });
    if (selectedCatalog) loadItems(selectedCatalog);
  };

  const handleSaveItemEdit = async (itemId: string, patch: { name?: string; brand?: string; model?: string; unit_price?: number | null; specifications?: string }) => {
    setError('');
    try {
      const result = await updateCatalogItem(itemId, patch);
      if (!result.success) {
        setError(result.error || 'Failed to update item');
        return;
      }
      if (selectedCatalog) loadItems(selectedCatalog);
    } catch { setError('Network error'); }
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
                <select value={newCatalogCategory} onChange={e => setNewCatalogCategory(e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 6, boxSizing: 'border-box' }}>
                  <option value="">Select Category...</option>
                  {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Product image:</label>
                      <input type="file" accept={IMAGE_MIME} onChange={e => setNewItemImage(e.target.files?.[0] || null)} style={{ fontSize: 12 }} />
                      {newItemImage && <span style={{ fontSize: 12, color: '#059669' }}>{newItemImage.name} ({Math.round(newItemImage.size / 1024)} KB)</span>}
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>PNG/JPEG/WEBP, ≤5 MB</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleAddItem} disabled={savingItem} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, color: 'white', background: savingItem ? '#86efac' : '#059669', border: 'none', borderRadius: 6, cursor: savingItem ? 'not-allowed' : 'pointer' }}>
                        {savingItem ? 'Saving...' : 'Add Item'}
                      </button>
                      <button onClick={() => { setShowNewItem(false); setNewItemImage(null); }} style={{ padding: '8px 20px', fontSize: 13, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(item => <CatalogItemCard key={item.id} item={item} onDelete={handleDeleteItem} onReplaceImage={handleReplaceItemImage} onSaveEdit={handleSaveItemEdit} />)}
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
