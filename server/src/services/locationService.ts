import { projectDb } from './domainDb';

/**
 * Locations API: autocomplete search + zip-set expansion.
 * Source of truth for the contractor service-area picker (TK-2741).
 */

const LEVEL_ORDER: Record<string, number> = { state: 5, metro: 4, county: 3, city: 2, zip: 1 };

export async function searchLocations(opts: { q: string; level?: string; limit?: number }) {
  const q = opts.q.trim();
  if (q.length < 2) return [];
  const limit = Math.min(opts.limit ?? 20, 50);
  // Substring match first (fast and intuitive for "San Francisco", "Bay", "94506"),
  // OR pg_trgm `%` fuzzy match for typo tolerance ("San Fransisco"). Order by:
  //  1. Whether the search_text starts with the query (best match),
  //  2. Whether it contains the query at all,
  //  3. Trigram similarity for fuzzy fallbacks,
  //  4. Level priority — metros and cities ranked above zips so the headline
  //     bucket appears at the top of the dropdown.
  const rows = await projectDb.queryAll<any>(
    `SELECT id, level, display_label, state_code, state_name, county_name, city_name,
            metro_code, metro_name, zip_code,
            similarity(search_text, $1) AS sim
       FROM locations
      WHERE ($2::text IS NULL OR level = $2)
        AND (search_text ILIKE '%' || $1 || '%' OR search_text % $1)
      ORDER BY
        CASE WHEN search_text ILIKE $1 || '%' THEN 0
             WHEN search_text ILIKE '%' || $1 || '%' THEN 1
             ELSE 2 END,
        CASE level WHEN 'metro' THEN 1 WHEN 'city' THEN 2 WHEN 'county' THEN 3 WHEN 'state' THEN 4 WHEN 'zip' THEN 5 ELSE 6 END,
        similarity(search_text, $1) DESC,
        length(search_text) ASC
      LIMIT $3`,
    [q.toLowerCase(), opts.level || null, limit]
  );
  return rows.map(r => ({ ...r, sim: undefined }));
}

/**
 * Expand a chosen location id (any level) to the underlying zip set so the
 * service-area filter can do a clean `project.zip_code IN (zips)` match.
 */
export async function expandLocationToZips(locationId: string): Promise<string[]> {
  const sel = await projectDb.queryOne<{ level: string; state_code: string | null; county_name: string | null; city_name: string | null; metro_code: string | null; zip_code: string | null }>(
    `SELECT level, state_code, county_name, city_name, metro_code, zip_code FROM locations WHERE id = $1`,
    [locationId]
  );
  if (!sel) return [];
  if (sel.level === 'zip' && sel.zip_code) return [sel.zip_code];

  let where = '';
  const values: any[] = [];
  if (sel.level === 'state' && sel.state_code) { where = 'state_code = $1'; values.push(sel.state_code); }
  else if (sel.level === 'metro' && sel.metro_code) { where = 'metro_code = $1'; values.push(sel.metro_code); }
  else if (sel.level === 'county' && sel.county_name && sel.state_code) { where = 'county_name = $1 AND state_code = $2'; values.push(sel.county_name, sel.state_code); }
  else if (sel.level === 'city' && sel.city_name && sel.state_code) { where = 'city_name = $1 AND state_code = $2'; values.push(sel.city_name, sel.state_code); }
  else return [];

  const rows = await projectDb.queryAll<{ zip_code: string }>(
    `SELECT DISTINCT zip_code FROM locations WHERE level = 'zip' AND ${where}`, values
  );
  return rows.map(r => r.zip_code).filter(Boolean);
}

/**
 * Bulk version — used by getAvailableProjects. Also returns the union of city
 * names so we can fall back to a city ILIKE match for projects without a zip.
 */
export async function expandLocationsForFilter(locationIds: string[]): Promise<{ zips: string[]; cities: string[] }> {
  if (!locationIds || locationIds.length === 0) return { zips: [], cities: [] };
  const rows = await projectDb.queryAll<{ level: string; state_code: string | null; county_name: string | null; city_name: string | null; metro_code: string | null; zip_code: string | null }>(
    `SELECT level, state_code, county_name, city_name, metro_code, zip_code
       FROM locations WHERE id = ANY($1::uuid[])`,
    [locationIds]
  );
  const zipSet = new Set<string>();
  const citySet = new Set<string>();
  for (const sel of rows) {
    if (sel.level === 'zip' && sel.zip_code) { zipSet.add(sel.zip_code); continue; }
    if (sel.level === 'city' && sel.city_name) { citySet.add(sel.city_name); }
    let where = '';
    const values: any[] = [];
    if (sel.level === 'state' && sel.state_code) { where = 'state_code = $1'; values.push(sel.state_code); }
    else if (sel.level === 'metro' && sel.metro_code) { where = 'metro_code = $1'; values.push(sel.metro_code); }
    else if (sel.level === 'county' && sel.county_name && sel.state_code) { where = 'county_name = $1 AND state_code = $2'; values.push(sel.county_name, sel.state_code); }
    else if (sel.level === 'city' && sel.city_name && sel.state_code) { where = 'city_name = $1 AND state_code = $2'; values.push(sel.city_name, sel.state_code); }
    if (where) {
      const zipRows = await projectDb.queryAll<{ zip_code: string }>(
        `SELECT DISTINCT zip_code FROM locations WHERE level = 'zip' AND ${where}`, values
      );
      for (const z of zipRows) if (z.zip_code) zipSet.add(z.zip_code);
      // For metro/county/state, also collect every city name beneath it so the
      // city-name fallback works for projects that haven't populated zip yet.
      if (sel.level !== 'zip' && sel.level !== 'city') {
        const cityRows = await projectDb.queryAll<{ city_name: string }>(
          `SELECT DISTINCT city_name FROM locations WHERE level = 'city' AND ${where}`, values
        );
        for (const c of cityRows) if (c.city_name) citySet.add(c.city_name);
      }
    }
  }
  return { zips: Array.from(zipSet), cities: Array.from(citySet) };
}

export async function getLocationsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  return await projectDb.queryAll(
    `SELECT id, level, display_label, state_code, state_name, county_name, city_name, metro_code, metro_name, zip_code
       FROM locations WHERE id = ANY($1::uuid[])`,
    [ids]
  );
}

export const locationService = { searchLocations, expandLocationToZips, expandLocationsForFilter, getLocationsByIds, LEVEL_ORDER };
