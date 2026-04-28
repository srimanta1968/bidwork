import { catalogDb } from './domainDb';

export async function getCatalogs(contractorId: string) {
  try {
    return await catalogDb.queryAll(
      'SELECT * FROM contractor_catalogs WHERE contractor_id = $1 ORDER BY job_category',
      [contractorId]
    );
  } catch (error) { console.error('Get catalogs error:', error); throw error; }
}

export async function createCatalog(contractorId: string, data: { job_category: string; name: string }) {
  try {
    return await catalogDb.queryOne(
      'INSERT INTO contractor_catalogs (contractor_id, job_category, name) VALUES ($1, $2, $3) RETURNING *',
      [contractorId, data.job_category, data.name]
    );
  } catch (error) { console.error('Create catalog error:', error); throw error; }
}

export async function getCatalogItems(catalogId: string) {
  try {
    const rows = await catalogDb.queryAll<any>(
      'SELECT * FROM catalog_items WHERE catalog_id = $1 ORDER BY name',
      [catalogId]
    );
    // Resolve image_url → presigned download URL for S3 keys; pass through https URLs.
    const { s3Service } = await import('./s3Service');
    return await Promise.all(rows.map(async r => ({
      ...r,
      image_download_url: await s3Service.resolveImageUrl(r.image_url),
    })));
  } catch (error) { console.error('Get catalog items error:', error); throw error; }
}

export async function addCatalogItem(catalogId: string, data: { name: string; brand?: string; model?: string; specifications?: string; image_url?: string; unit_price?: number }) {
  try {
    return await catalogDb.queryOne(
      `INSERT INTO catalog_items (catalog_id, name, brand, model, specifications, image_url, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [catalogId, data.name, data.brand || null, data.model || null, data.specifications || null, data.image_url || null, data.unit_price || null]
    );
  } catch (error) { console.error('Add catalog item error:', error); throw error; }
}

export async function updateCatalogItem(itemId: string, data: { name?: string; brand?: string; model?: string; specifications?: string; image_url?: string; unit_price?: number }) {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.brand !== undefined) { fields.push(`brand = $${idx++}`); values.push(data.brand); }
    if (data.model !== undefined) { fields.push(`model = $${idx++}`); values.push(data.model); }
    if (data.specifications !== undefined) { fields.push(`specifications = $${idx++}`); values.push(data.specifications); }
    if (data.image_url !== undefined) { fields.push(`image_url = $${idx++}`); values.push(data.image_url); }
    if (data.unit_price !== undefined) { fields.push(`unit_price = $${idx++}`); values.push(data.unit_price); }

    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    values.push(itemId);

    return await catalogDb.queryOne(
      `UPDATE catalog_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
  } catch (error) { console.error('Update catalog item error:', error); throw error; }
}

export async function deleteCatalogItem(itemId: string) {
  try {
    return await catalogDb.queryOne('DELETE FROM catalog_items WHERE id = $1 RETURNING *', [itemId]);
  } catch (error) { console.error('Delete catalog item error:', error); throw error; }
}

export async function getCatalogItem(itemId: string) {
  try {
    return await catalogDb.queryOne<any>('SELECT * FROM catalog_items WHERE id = $1', [itemId]);
  } catch (error) { console.error('Get catalog item error:', error); throw error; }
}

/**
 * Verify that the contractor owns the catalog containing this item.
 */
export async function isCatalogItemOwnedBy(itemId: string, contractorId: string): Promise<boolean> {
  try {
    const row = await catalogDb.queryOne<{ contractor_id: string }>(
      `SELECT c.contractor_id
         FROM catalog_items i JOIN contractor_catalogs c ON c.id = i.catalog_id
        WHERE i.id = $1`,
      [itemId]
    );
    return row?.contractor_id === contractorId;
  } catch { return false; }
}

export const catalogService = {
  getCatalogs, createCatalog, getCatalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem,
  getCatalogItem, isCatalogItemOwnedBy,
};
