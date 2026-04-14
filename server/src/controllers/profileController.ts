import { Response } from 'express';
import { profileService } from '../services/profileService';
import { AuthenticatedRequest, CONTRACTOR_CATEGORIES, SKILLED_LABOR_CATEGORIES, BOTH_CATEGORIES, ALL_PROJECT_CATEGORIES } from '../types';

/**
 * GET /api/profile/me
 */
export async function getMyProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const profile = await profileService.getProfileByUserId(req.user.userId);
    res.status(200).json({ success: true, data: { profile } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/profile/onboard
 */
export async function onboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { business_name, office_address, phone, license_number, license_type, category, skills, years_experience, bio } = req.body;

    if (!phone || !category) {
      res.status(400).json({ success: false, error: 'Phone and category are required' });
      return;
    }

    if (req.user.role === 'contractor' && !license_number) {
      res.status(400).json({ success: false, error: 'License number is required for contractors' });
      return;
    }

    const profile = await profileService.onboardProfile(req.user.userId, {
      business_name, office_address, phone, license_number, license_type,
      category, skills, years_experience, bio,
    });

    res.status(200).json({ success: true, data: { profile } });
  } catch (error) {
    console.error('Onboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * GET /api/profile/categories
 */
export async function getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {
        contractor: [...CONTRACTOR_CATEGORIES, ...BOTH_CATEGORIES],
        skilled_labor: [...SKILLED_LABOR_CATEGORIES, ...BOTH_CATEGORIES],
        all_project: [...ALL_PROJECT_CATEGORIES],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * PUT /api/profile/serving-areas
 */
/**
 * PUT /api/profile/update
 */
export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }

    const { business_name, office_address, phone, license_number, license_type, category, skills, years_experience, bio, serving_cities, serving_zipcodes } = req.body;
    const profile = await profileService.updateProfile(req.user.userId, {
      business_name, office_address, phone, license_number, license_type,
      category, skills, years_experience, bio, serving_cities, serving_zipcodes,
    });
    if (!profile) { res.status(404).json({ success: false, error: 'Profile not found. Complete onboarding first.' }); return; }

    res.status(200).json({ success: true, data: { profile } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateServingAreas(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }

    const { serving_cities, serving_zipcodes } = req.body;
    const profile = await profileService.updateServingAreas(req.user.userId, { serving_cities, serving_zipcodes });
    if (!profile) { res.status(404).json({ success: false, error: 'Profile not found' }); return; }

    res.status(200).json({ success: true, data: { profile } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}
