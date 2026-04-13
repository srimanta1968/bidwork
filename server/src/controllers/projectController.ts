import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { projectService } from '../services/projectService';
import { s3Service } from '../services/s3Service';
import { profileService } from '../services/profileService';

export async function presignUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { project_id, files } = req.body;
    if (!project_id || !files?.length) { res.status(400).json({ success: false, error: 'project_id and files array required' }); return; }

    // Validate content types (photos + videos)
    for (const f of files) {
      if (!ALLOWED_CONTENT_TYPES.includes(f.content_type)) {
        res.status(400).json({ success: false, error: `Unsupported file type: ${f.content_type}. Allowed: JPEG, PNG, WebP, HEIC, MP4, MOV, WebM` });
        return;
      }
    }

    const presigned = await Promise.all(files.map(async (f: { filename: string; content_type: string; media_type: string }) => {
      const mediaType = f.content_type.startsWith('image/') ? 'photo' : 'video';
      const s3Key = s3Service.generateS3Key(project_id, f.filename, mediaType);
      const { url, expiresIn } = await s3Service.getPresignedUploadUrl(s3Key, f.content_type);
      return { s3_key: s3Key, upload_url: url, expires_in: expiresIn, filename: f.filename, media_type: mediaType };
    }));

    res.status(200).json({ success: true, data: { presigned_urls: presigned } });
  } catch (error: any) { console.error('Presign error:', error); res.status(500).json({ success: false, error: error.message }); }
}

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { title, description, location_address, urgency, quality_tier, worker_type_preference, media } = req.body;
    if (!title) { res.status(400).json({ success: false, error: 'Title is required' }); return; }

    const project = await projectService.createProject(req.user.userId, { title, description, location_address, urgency, quality_tier, worker_type_preference });

    // Add media records and mark first as representative
    if (media?.length > 0) {
      for (let i = 0; i < media.length; i++) {
        await projectService.addMedia(project.id, { ...media[i], sort_order: i, is_representative: i === 0 });
      }
      await projectService.startAiPipeline(project.id);
    }

    res.status(202).json({ success: true, data: { project_id: project.id, status: media?.length > 0 ? 'classifying' : 'uploading' } });
  } catch (error: any) { console.error('Create project error:', error); res.status(500).json({ success: false, error: error.message }); }
}

export async function confirmMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { project_id, media } = req.body;
    if (!project_id || !media?.length) { res.status(400).json({ success: false, error: 'project_id and media required' }); return; }

    for (let i = 0; i < media.length; i++) {
      await projectService.addMedia(project_id, { ...media[i], sort_order: i, is_representative: i === 0 });
    }
    await projectService.startAiPipeline(project_id);

    res.status(200).json({ success: true, data: { status: 'classifying' } });
  } catch (error: any) { console.error('Confirm media error:', error); res.status(500).json({ success: false, error: error.message }); }
}

export async function getMyProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const projects = await projectService.getProjectsByHomeowner(req.user.userId);
    res.status(200).json({ success: true, data: { projects } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const project = await projectService.getProject(req.params.id);
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }

    const media = await projectService.getProjectMedia(req.params.id);
    const isOwner = project.homeowner_id === req.user.userId;
    const isContractor = !isOwner;
    const tasks = project.scope_status === 'complete' ? await projectService.getScopeTasks(req.params.id, isContractor) : [];

    // Generate presigned download URLs for media
    const mediaWithUrls = await Promise.all(media.map(async (m: any) => ({
      ...m, url: await s3Service.getPresignedDownloadUrl(m.s3_key),
    })));

    // Apply address privacy for non-owner users (contractors)
    const isWinner = isContractor && await projectService.isAcceptedBidder(req.params.id, req.user.userId);
    const sanitizedProject = isOwner ? project : projectService.sanitizeProjectForContractor(project, isWinner);

    res.status(200).json({ success: true, data: { project: sanitizedProject, media: mediaWithUrls, tasks } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getProjectStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const status = await projectService.getProjectStatus(req.params.id);
    res.status(200).json({ success: true, data: status });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function approveProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const project = await projectService.approveProject(req.params.id);
    res.status(200).json({ success: true, data: { project } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function retryProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    await projectService.retryPipeline(req.params.id);
    res.status(200).json({ success: true, data: { status: 'retrying' } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getAvailableProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }

    const category = req.query.category as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get contractor's serving areas and role for filtering
    const profile = await profileService.getProfileByUserId(req.user.userId);
    const servingCities = (profile as any)?.serving_cities || [];
    const servingZipcodes = (profile as any)?.serving_zipcodes || [];
    const userRole = req.user.role;
    const city = req.query.city as string | undefined;

    const projects = await projectService.getAvailableProjects({
      category, city, page, limit, userRole,
      servingCities: servingCities.length > 0 ? servingCities : undefined,
      servingZipcodes: servingZipcodes.length > 0 ? servingZipcodes : undefined,
    });

    const areaLabel = servingCities.length > 0 ? servingCities.join(', ') : 'All Areas';
    res.status(200).json({ success: true, data: { projects, filters: { city: areaLabel, category, page, limit, servingCities, servingZipcodes } } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

const ALLOWED_CONTENT_TYPES = [
  'video/mp4', 'video/quicktime', 'video/webm',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
];

export async function getDraftProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const project = await projectService.getProject(req.params.id);
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    if (project.homeowner_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your project' }); return; }

    const media = await projectService.getProjectMedia(req.params.id);
    const mediaWithUrls = await Promise.all(media.map(async (m: any) => ({
      ...m, url: await s3Service.getPresignedDownloadUrl(m.s3_key),
    })));

    const tasks = ['complete', 'review'].includes(project.scope_status)
      ? await projectService.getScopeTasks(req.params.id) : [];

    res.status(200).json({ success: true, data: { project, media: mediaWithUrls, tasks } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateDraftProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }

    const project = await projectService.getProject(req.params.id);
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    if (project.homeowner_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your project' }); return; }
    if (project.status !== 'draft') { res.status(400).json({ success: false, error: 'Only draft projects can be updated' }); return; }

    const { title, description, location_address, urgency, quality_tier } = req.body;
    const updated = await projectService.updateProject(req.params.id, { title, description, location_address, urgency, quality_tier });

    res.status(200).json({ success: true, data: { project: updated } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function setTaskPrice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }

    const project = await projectService.getProject(req.params.id);
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    if (project.homeowner_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your project' }); return; }

    const { owner_start_price } = req.body;
    if (owner_start_price === undefined || owner_start_price === null) {
      res.status(400).json({ success: false, error: 'owner_start_price is required' }); return;
    }

    const task = await projectService.getScopeTask(req.params.taskId);
    if (!task) { res.status(404).json({ success: false, error: 'Task not found' }); return; }

    // Validate against bid price rule
    const aiStartPrice = task.cost_min;
    const rule = await projectService.getBidPriceRule(project.category);
    const minAllowed = (rule.min_price_percentage / 100) * aiStartPrice;

    if (owner_start_price < minAllowed) {
      res.status(400).json({
        success: false,
        error: `Price cannot be below ${rule.min_price_percentage}% of AI-generated price`,
        data: { min_allowed: minAllowed, ai_start_price: aiStartPrice, threshold_percentage: rule.min_price_percentage }
      });
      return;
    }

    const updated = await projectService.setTaskOwnerPrice(req.params.id, req.params.taskId, owner_start_price);
    res.status(200).json({ success: true, data: { task: updated } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const project = await projectService.getProject(req.params.id);
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    if (project.homeowner_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your project' }); return; }
    if (!['draft', 'uploading'].includes(project.status) && project.scope_status !== 'complete') {
      res.status(400).json({ success: false, error: 'Tasks can only be edited before publishing' }); return;
    }

    const { title, description, homeowner_notes, dimensions, quantity, unit } = req.body;
    const updated = await projectService.updateScopeTask(req.params.id, req.params.taskId, { title, description, homeowner_notes, dimensions, quantity, unit });
    if (!updated) { res.status(404).json({ success: false, error: 'Task not found' }); return; }
    res.status(200).json({ success: true, data: { task: updated } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function toggleTaskVisibility(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const project = await projectService.getProject(req.params.id);
    if (!project) { res.status(404).json({ success: false, error: 'Project not found' }); return; }
    if (project.homeowner_id !== req.user.userId) { res.status(403).json({ success: false, error: 'Not your project' }); return; }

    const { is_hidden } = req.body;
    if (is_hidden === undefined) { res.status(400).json({ success: false, error: 'is_hidden is required' }); return; }

    const updated = await projectService.toggleTaskVisibility(req.params.id, req.params.taskId, is_hidden);
    if (!updated) { res.status(404).json({ success: false, error: 'Task not found' }); return; }
    res.status(200).json({ success: true, data: { task: updated } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function deleteMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const deleted = await projectService.deleteMedia(req.params.mediaId);
    if (!deleted) { res.status(404).json({ success: false, error: 'Media not found' }); return; }
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}
