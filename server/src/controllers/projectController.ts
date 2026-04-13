import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { projectService } from '../services/projectService';
import { s3Service } from '../services/s3Service';

export async function presignUpload(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { project_id, files } = req.body;
    if (!project_id || !files?.length) { res.status(400).json({ success: false, error: 'project_id and files array required' }); return; }

    const presigned = await Promise.all(files.map(async (f: { filename: string; content_type: string; media_type: string }) => {
      const s3Key = s3Service.generateS3Key(project_id, f.filename, f.media_type);
      const { url, expiresIn } = await s3Service.getPresignedUploadUrl(s3Key, f.content_type);
      return { s3_key: s3Key, upload_url: url, expires_in: expiresIn, filename: f.filename, media_type: f.media_type };
    }));

    res.status(200).json({ success: true, data: { presigned_urls: presigned } });
  } catch (error: any) { console.error('Presign error:', error); res.status(500).json({ success: false, error: error.message }); }
}

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { title, description, location_address, urgency, quality_tier, media } = req.body;
    if (!title) { res.status(400).json({ success: false, error: 'Title is required' }); return; }

    const project = await projectService.createProject(req.user.userId, { title, description, location_address, urgency, quality_tier });

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
    const tasks = project.scope_status === 'complete' ? await projectService.getScopeTasks(req.params.id) : [];

    // Generate presigned download URLs for media
    const mediaWithUrls = await Promise.all(media.map(async (m: any) => ({
      ...m, url: await s3Service.getPresignedDownloadUrl(m.s3_key),
    })));

    res.status(200).json({ success: true, data: { project, media: mediaWithUrls, tasks } });
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
    const category = (req.query.category as string) || '';
    const projects = await projectService.getAvailableProjects(category);
    res.status(200).json({ success: true, data: { projects } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}
