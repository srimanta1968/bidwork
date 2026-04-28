import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { searchLocations } from '../../services/projectApi';

export interface LocationOption {
  id: string;
  level: 'state' | 'metro' | 'county' | 'city' | 'zip';
  display_label: string;
  state_code?: string | null;
  city_name?: string | null;
  county_name?: string | null;
  metro_name?: string | null;
  zip_code?: string | null;
}

interface Props {
  selected: LocationOption[];
  onChange: (next: LocationOption[]) => void;
}

export interface LocationPickerHandle {
  /** Commit whatever the user typed into the search box as a chip. Awaits a fresh
   * server lookup if the cached results are stale, then resolves to the updated
   * selection. The parent's Save button calls this before persisting. */
  commitPending: () => Promise<LocationOption[]>;
}

const LEVEL_BADGES: Record<LocationOption['level'], { label: string; bg: string; fg: string }> = {
  state: { label: 'State', bg: '#fef3c7', fg: '#92400e' },
  metro: { label: 'Metro', bg: '#e0e7ff', fg: '#3730a3' },
  county: { label: 'County', bg: '#ccfbf1', fg: '#0f766e' },
  city: { label: 'City', bg: '#eff6ff', fg: '#1e40af' },
  zip: { label: 'Zip', bg: '#f1f5f9', fg: '#475569' },
};

const LocationPicker = forwardRef<LocationPickerHandle, Props>(function LocationPicker({ selected, onChange }, ref) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<LocationOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a live ref of `selected` so commitPending sees the latest array instead
  // of a stale closure.
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchLocations(q.trim(), undefined, 12);
        if (r.success) setResults(r.data.results || []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const isSelected = (id: string) => selectedRef.current.some(s => s.id === id);

  const add = (opt: LocationOption) => {
    if (isSelected(opt.id)) return;
    onChange([...selectedRef.current, opt]);
    setQ(''); setResults([]); setOpen(false);
  };

  const remove = (id: string) => onChange(selectedRef.current.filter(s => s.id !== id));

  /**
   * Best-effort: take the top current result if available; otherwise hit the
   * server fresh (the user might have typed faster than the debounce). Adds
   * the match as a chip and clears the input. Returns the new selection so
   * the parent can save without a re-render race.
   */
  const commitPending = async (): Promise<LocationOption[]> => {
    const query = q.trim();
    if (!query) return selectedRef.current;
    let pick: LocationOption | undefined = results[0];
    if (!pick) {
      try {
        const r = await searchLocations(query, undefined, 1);
        if (r.success && r.data.results?.length) pick = r.data.results[0];
      } catch { /* silent */ }
    }
    if (!pick || isSelected(pick.id)) {
      setQ(''); setResults([]); setOpen(false);
      return selectedRef.current;
    }
    const next = [...selectedRef.current, pick];
    onChange(next);
    setQ(''); setResults([]); setOpen(false);
    return next;
  };

  useImperativeHandle(ref, () => ({ commitPending }));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitPending(); }
    if (e.key === 'Escape') { setOpen(false); setQ(''); }
  };

  return (
    <div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e3a8a', marginBottom: 12 }}>
        Pick the metros, counties, cities, or specific zip codes you serve. Selecting a metro automatically covers every city and zip inside it.
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onKeyDown={handleKeyDown}
          placeholder="Search city / zip / county / metro (e.g. Danville, 94506, Bay Area). Press Enter to add."
          style={{ width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box' }} />
        {open && (q.trim().length >= 2 || loading) && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', zIndex: 20, maxHeight: 320, overflowY: 'auto' }}>
            {loading && <p style={{ padding: 12, fontSize: 13, color: '#94a3b8' }}>Searching…</p>}
            {!loading && results.length === 0 && q.trim().length >= 2 && (
              <p style={{ padding: 12, fontSize: 13, color: '#94a3b8' }}>No matches. Try a metro name like "San Francisco" or a zip code.</p>
            )}
            {results.map(r => {
              const badge = LEVEL_BADGES[r.level];
              const taken = isSelected(r.id);
              return (
                <button key={r.id} onMouseDown={e => { e.preventDefault(); add(r); }} disabled={taken}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 14px', background: taken ? '#f8fafc' : 'white', border: 'none', borderTop: '1px solid #f1f5f9', cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.55 : 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.fg }}>{badge.label}</span>
                  <span style={{ flex: 1, fontSize: 14, color: '#0f172a' }}>{r.display_label}</span>
                  {taken && <span style={{ fontSize: 11, color: '#94a3b8' }}>added</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No service areas selected — you'll see all available jobs.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {selected.map(s => {
            const badge = LEVEL_BADGES[s.level];
            return (
              <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #bfdbfe', borderRadius: 999, padding: '4px 10px 4px 4px', fontSize: 13, color: '#1e3a8a' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: badge.bg, color: badge.fg }}>{badge.label}</span>
                {s.display_label}
                <button onClick={() => remove(s.id)} style={{ fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4 }}>×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default LocationPicker;
