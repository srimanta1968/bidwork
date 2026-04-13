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
 * Update contractor/skilled labor serving areas
 */
export async function updateServingAreas(userId: string, data: { serving_cities?: string[]; serving_zipcodes?: string[] }): Promise<ContractorProfile | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

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

export const profileService = {
  getProfileByUserId,
  onboardProfile,
  updateServingAreas,
};
