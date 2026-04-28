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

    const { serving_cities, serving_zipcodes, serving_location_ids } = req.body;
    const profile = await profileService.updateServingAreas(req.user.userId, { serving_cities, serving_zipcodes, serving_location_ids });
    if (!profile) { res.status(404).json({ success: false, error: 'Profile not found' }); return; }

    res.status(200).json({ success: true, data: { profile } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * GET /api/profile/billing — contractor's billing/tax profile used as receipt issuer.
 */
export async function getBillingProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const billing = await profileService.getBillingProfile(req.user.userId);
    if (!billing) { res.status(404).json({ success: false, error: 'Profile not found. Complete onboarding first.' }); return; }
    res.status(200).json({ success: true, data: { billing } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

/**
 * PUT /api/profile/billing — update billing/tax fields; recomputes the
 * billing_profile_completed_at flag based on whether all required fields are populated.
 */
export async function updateBillingProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { legal_company_name, ein, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_phone, signature_s3_key } = req.body;
    const billing = await profileService.updateBillingProfile(req.user.userId, {
      legal_company_name, ein, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_phone, signature_s3_key,
    });
    res.status(200).json({ success: true, data: { billing } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

/**
 * POST /api/profile/billing/signature/presign — returns an S3 PUT URL for the
 * contractor signature image. Allowed mime: image/png, image/jpeg.
 */
export async function presignSignatureUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { filename, content_type } = req.body;
    if (!filename || !content_type) { res.status(400).json({ success: false, error: 'filename and content_type required' }); return; }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(content_type)) {
      res.status(400).json({ success: false, error: 'Signature must be PNG or JPEG' }); return;
    }
    const { s3Service } = await import('../services/s3Service');
    const s3_key = s3Service.generateSignatureKey(req.user.userId, filename);
    const { url, expiresIn } = await s3Service.getPresignedUploadUrl(s3_key, content_type);
    res.status(200).json({ success: true, data: { s3_key, upload_url: url, expires_in: expiresIn } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}
