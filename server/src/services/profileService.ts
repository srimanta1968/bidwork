import { authDb } from './domainDb';
import { authService } from './authService';
import { ContractorProfile, OnboardingPayload } from '../types';

/**
 * Get contractor/skilled labor profile by user ID
 */
export async function getProfileByUserId(userId: string): Promise<ContractorProfile | null> {
  try {
    return await authDb.queryOne<ContractorProfile>(
      'SELECT * FROM contractor_profiles WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Get profile error:', error);
    throw new Error('Failed to get profile');
  }
}

/**
 * Create or update contractor/skilled labor profile (onboarding)
 */
export async function onboardProfile(userId: string, payload: OnboardingPayload): Promise<ContractorProfile> {
  try {
    const existing = await getProfileByUserId(userId);

    if (existing) {
      const profile = await authDb.queryOne<ContractorProfile>(
        `UPDATE contractor_profiles SET
          business_name = $2, office_address = $3, phone = $4,
          license_number = $5, license_type = $6, category = $7,
          skills = $8, years_experience = $9, bio = $10, updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId, payload.business_name || null, payload.office_address || null, payload.phone,
         payload.license_number || null, payload.license_type || null, payload.category,
         payload.skills || null, payload.years_experience || null, payload.bio || null]
      );
      if (!profile) throw new Error('Failed to update profile');
      await authService.markOnboarded(userId);
      return profile;
    }

    const profile = await authDb.queryOne<ContractorProfile>(
      `INSERT INTO contractor_profiles (user_id, business_name, office_address, phone, license_number, license_type, category, skills, years_experience, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, payload.business_name || null, payload.office_address || null, payload.phone,
       payload.license_number || null, payload.license_type || null, payload.category,
       payload.skills || null, payload.years_experience || null, payload.bio || null]
    );

    if (!profile) throw new Error('Failed to create profile');
    await authService.markOnboarded(userId);
    return profile;
  } catch (error) {
    console.error('Onboard profile error:', error);
    throw error;
  }
}

/**
 * Update contractor/skilled labor serving areas. When `serving_location_ids`
 * is provided, the server also derives the legacy `serving_cities` and
 * `serving_zipcodes` arrays from the resolved zip set so the older filter
 * path keeps working until cutover is complete.
 */
export async function updateServingAreas(userId: string, data: { serving_cities?: string[]; serving_zipcodes?: string[]; serving_location_ids?: string[] }): Promise<ContractorProfile | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.serving_location_ids !== undefined) {
      fields.push(`serving_location_ids = $${idx++}::uuid[]`); values.push(data.serving_location_ids);
      // Derive legacy arrays from the chosen locations so backward-compat path keeps working.
      try {
        const { locationService } = await import('./locationService');
        const expanded = await locationService.expandLocationsForFilter(data.serving_location_ids);
        if (data.serving_cities === undefined) {
          fields.push(`serving_cities = $${idx++}`); values.push(expanded.cities);
        }
        if (data.serving_zipcodes === undefined) {
          fields.push(`serving_zipcodes = $${idx++}`); values.push(expanded.zips);
        }
      } catch (err) {
        console.error('Could not derive legacy serving arrays from location ids:', err);
      }
    }
    if (data.serving_cities !== undefined) { fields.push(`serving_cities = $${idx++}`); values.push(data.serving_cities); }
    if (data.serving_zipcodes !== undefined) { fields.push(`serving_zipcodes = $${idx++}`); values.push(data.serving_zipcodes); }

    if (fields.length === 0) return await getProfileByUserId(userId);

    fields.push('updated_at = NOW()');
    values.push(userId);

    return await authDb.queryOne<ContractorProfile>(
      `UPDATE contractor_profiles SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING *`,
      values
    );
  } catch (error) {
    console.error('Update serving areas error:', error);
    throw error;
  }
}

/**
 * Update contractor/skilled labor full profile
 */
export async function updateProfile(userId: string, payload: OnboardingPayload & { serving_cities?: string[]; serving_zipcodes?: string[] }): Promise<ContractorProfile | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (payload.business_name !== undefined) { fields.push(`business_name = $${idx++}`); values.push(payload.business_name || null); }
    if (payload.office_address !== undefined) { fields.push(`office_address = $${idx++}`); values.push(payload.office_address || null); }
    if (payload.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(payload.phone); }
    if (payload.license_number !== undefined) { fields.push(`license_number = $${idx++}`); values.push(payload.license_number || null); }
    if (payload.license_type !== undefined) { fields.push(`license_type = $${idx++}`); values.push(payload.license_type || null); }
    if (payload.category !== undefined) { fields.push(`category = $${idx++}`); values.push(payload.category); }
    if (payload.skills !== undefined) { fields.push(`skills = $${idx++}`); values.push(payload.skills || null); }
    if (payload.years_experience !== undefined) { fields.push(`years_experience = $${idx++}`); values.push(payload.years_experience || null); }
    if (payload.bio !== undefined) { fields.push(`bio = $${idx++}`); values.push(payload.bio || null); }
    if (payload.serving_cities !== undefined) { fields.push(`serving_cities = $${idx++}`); values.push(payload.serving_cities); }
    if (payload.serving_zipcodes !== undefined) { fields.push(`serving_zipcodes = $${idx++}`); values.push(payload.serving_zipcodes); }

    if (fields.length === 0) return await getProfileByUserId(userId);

    fields.push('updated_at = NOW()');
    values.push(userId);

    return await authDb.queryOne<ContractorProfile>(
      `UPDATE contractor_profiles SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING *`,
      values
    );
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

// ── Billing & Tax Profile (issuer details for contractor-issued receipts) ──

export interface BillingProfileInput {
  legal_company_name?: string;
  ein?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_phone?: string;
  signature_s3_key?: string;
}

const BILLING_REQUIRED_FIELDS: (keyof BillingProfileInput)[] = [
  'legal_company_name', 'ein', 'billing_address_line1',
  'billing_city', 'billing_state', 'billing_zip', 'billing_phone',
];

const EIN_REGEX = /^(\d{2}-?\d{7}|\d{9})$/;

export function isBillingProfileComplete(profile: any): boolean {
  if (!profile) return false;
  return BILLING_REQUIRED_FIELDS.every(f => {
    const v = profile[f];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

export async function getBillingProfile(userId: string): Promise<{
  legal_company_name: string | null;
  ein: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_phone: string | null;
  signature_s3_key: string | null;
  billing_profile_completed_at: string | null;
  billing_profile_complete: boolean;
} | null> {
  try {
    const row = await authDb.queryOne<any>(
      `SELECT legal_company_name, ein, billing_address_line1, billing_address_line2,
              billing_city, billing_state, billing_zip, billing_phone,
              signature_s3_key, billing_profile_completed_at
         FROM contractor_profiles WHERE user_id = $1`,
      [userId]
    );
    if (!row) return null;
    return { ...row, billing_profile_complete: row.billing_profile_completed_at !== null };
  } catch (error) { console.error('Get billing profile error:', error); throw error; }
}

export async function updateBillingProfile(userId: string, payload: BillingProfileInput) {
  try {
    if (payload.ein !== undefined && payload.ein !== null && payload.ein !== '' && !EIN_REGEX.test(payload.ein)) {
      throw new Error('EIN must be in the format XX-XXXXXXX or 9 digits');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    const setIfDefined = (key: keyof BillingProfileInput) => {
      if (payload[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(payload[key] === '' ? null : payload[key]);
      }
    };
    BILLING_REQUIRED_FIELDS.forEach(setIfDefined);
    setIfDefined('billing_address_line2');
    setIfDefined('signature_s3_key');

    if (fields.length === 0) return await getBillingProfile(userId);

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    await authDb.query(
      `UPDATE contractor_profiles SET ${fields.join(', ')} WHERE user_id = $${idx}`,
      values
    );

    // Recompute completeness flag from the current row
    const fresh = await authDb.queryOne<any>(
      `SELECT legal_company_name, ein, billing_address_line1, billing_city, billing_state, billing_zip, billing_phone
         FROM contractor_profiles WHERE user_id = $1`,
      [userId]
    );
    const complete = isBillingProfileComplete(fresh);
    await authDb.query(
      `UPDATE contractor_profiles
         SET billing_profile_completed_at = CASE WHEN $2::boolean THEN COALESCE(billing_profile_completed_at, NOW()) ELSE NULL END
       WHERE user_id = $1`,
      [userId, complete]
    );

    return await getBillingProfile(userId);
  } catch (error) { console.error('Update billing profile error:', error); throw error; }
}

export const profileService = {
  getProfileByUserId,
  onboardProfile,
  updateServingAreas,
  updateProfile,
  getBillingProfile,
  updateBillingProfile,
  isBillingProfileComplete,
};
