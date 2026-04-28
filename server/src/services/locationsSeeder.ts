import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Loads the curated US locations seed (states · metros · counties · cities · zips)
 * into projects.locations on first server boot. Idempotent: re-running is a no-op
 * because the natural-key unique index plus ON CONFLICT DO NOTHING on every INSERT
 * means already-seeded rows are skipped.
 *
 * Wired into runMigrations() right after the projects schema is created.
 */
interface SeedFile {
  states: { code: string; name: string }[];
  metros: { code: string; name: string; primary_state: string }[];
  counties: { name: string; state_code: string; metro_code?: string | null }[];
  cities: { name: string; state_code: string; county_name?: string | null; metro_code?: string | null; lat?: number | null; lng?: number | null }[];
  zips: { code: string; city_name: string; state_code: string; county_name?: string | null; metro_code?: string | null; lat?: number | null; lng?: number | null }[];
}

function loadSeedFile(): SeedFile {
  // dist/services after build, src/services in dev — both resolve back to src/data/.
  const candidates = [
    join(__dirname, '..', 'data', 'locations-seed.json'),
    join(__dirname, '..', '..', 'src', 'data', 'locations-seed.json'),
  ];
  for (const p of candidates) {
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch { /* try next */ }
  }
  throw new Error('locations-seed.json not found in dist or src tree');
}

/**
 * Lowercases and concatenates the row's distinguishing fields so the GIN trigram
 * index can fuzzy-match user typos and partial inputs.
 */
function buildSearchText(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).map(s => String(s).toLowerCase()).join(' ');
}

export async function seedLocations(pool: Pool): Promise<{ inserted: number; skipped: boolean }> {
  // No count-based short-circuit — we rely on the unique natural-key index
  // and ON CONFLICT DO NOTHING for idempotency. This makes re-runs after a
  // schema change (e.g. fixing the natural-key columns) actually insert the
  // previously-rejected rows. Cost is ~280 round-trips per boot; negligible.

  let seed: SeedFile;
  try { seed = loadSeedFile(); }
  catch (err) {
    console.error('[migrate:locations] Could not load seed file:', err);
    return { inserted: 0, skipped: true };
  }

  let inserted = 0;
  const stateNameByCode = new Map<string, string>();
  const metroNameByCode = new Map<string, string>();

  // ── States ──
  for (const s of seed.states) {
    stateNameByCode.set(s.code, s.name);
    const display = s.name;
    const search = buildSearchText([s.code, s.name]);
    const r = await pool.query(
      `INSERT INTO projects.locations
         (country_code, state_code, state_name, level, display_label, search_text)
       VALUES ('US', $1, $2, 'state', $3, $4)
       ON CONFLICT DO NOTHING`,
      [s.code, s.name, display, search]
    );
    inserted += r.rowCount || 0;
  }

  // ── Metros (CBSAs) ──
  for (const m of seed.metros) {
    metroNameByCode.set(m.code, m.name);
    const display = m.name;
    const search = buildSearchText([m.code, m.name, m.primary_state, stateNameByCode.get(m.primary_state)]);
    const r = await pool.query(
      `INSERT INTO projects.locations
         (country_code, state_code, state_name, metro_code, metro_name, level, display_label, search_text)
       VALUES ('US', $1, $2, $3, $4, 'metro', $5, $6)
       ON CONFLICT DO NOTHING`,
      [m.primary_state, stateNameByCode.get(m.primary_state) || null, m.code, m.name, display, search]
    );
    inserted += r.rowCount || 0;
  }

  // ── Counties ──
  for (const c of seed.counties) {
    const display = `${c.name}, ${c.state_code}`;
    const metroName = c.metro_code ? metroNameByCode.get(c.metro_code) : null;
    const search = buildSearchText([c.name, c.state_code, stateNameByCode.get(c.state_code), metroName]);
    const r = await pool.query(
      `INSERT INTO projects.locations
         (country_code, state_code, state_name, county_name, metro_code, metro_name, level, display_label, search_text)
       VALUES ('US', $1, $2, $3, $4, $5, 'county', $6, $7)
       ON CONFLICT DO NOTHING`,
      [c.state_code, stateNameByCode.get(c.state_code) || null, c.name, c.metro_code || null, metroName || null, display, search]
    );
    inserted += r.rowCount || 0;
  }

  // ── Cities ──
  for (const ct of seed.cities) {
    const display = `${ct.name}, ${ct.state_code}`;
    const metroName = ct.metro_code ? metroNameByCode.get(ct.metro_code) : null;
    const search = buildSearchText([ct.name, ct.state_code, stateNameByCode.get(ct.state_code), ct.county_name, metroName]);
    const r = await pool.query(
      `INSERT INTO projects.locations
         (country_code, state_code, state_name, county_name, city_name, metro_code, metro_name,
          latitude, longitude, level, display_label, search_text)
       VALUES ('US', $1, $2, $3, $4, $5, $6, $7, $8, 'city', $9, $10)
       ON CONFLICT DO NOTHING`,
      [
        ct.state_code, stateNameByCode.get(ct.state_code) || null,
        ct.county_name || null, ct.name,
        ct.metro_code || null, metroName || null,
        ct.lat ?? null, ct.lng ?? null,
        display, search,
      ]
    );
    inserted += r.rowCount || 0;
  }

  // ── ZIPs ──
  for (const z of seed.zips) {
    const display = `${z.city_name}, ${z.state_code} · ${z.code}`;
    const metroName = z.metro_code ? metroNameByCode.get(z.metro_code) : null;
    const search = buildSearchText([z.code, z.city_name, z.state_code, stateNameByCode.get(z.state_code), z.county_name, metroName]);
    const r = await pool.query(
      `INSERT INTO projects.locations
         (country_code, state_code, state_name, county_name, city_name, zip_code, metro_code, metro_name,
          latitude, longitude, level, display_label, search_text)
       VALUES ('US', $1, $2, $3, $4, $5, $6, $7, $8, $9, 'zip', $10, $11)
       ON CONFLICT DO NOTHING`,
      [
        z.state_code, stateNameByCode.get(z.state_code) || null,
        z.county_name || null, z.city_name, z.code,
        z.metro_code || null, metroName || null,
        z.lat ?? null, z.lng ?? null,
        display, search,
      ]
    );
    inserted += r.rowCount || 0;
  }

  console.log(`[migrate:locations] Seeded ${inserted} rows`);
  return { inserted, skipped: false };
}
