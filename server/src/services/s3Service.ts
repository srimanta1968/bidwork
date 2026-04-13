import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

/**
 * Generate a unique S3 key for a project file
 */
export function generateS3Key(projectId: string, filename: string, mediaType: string): string {
  const ext = filename.split('.').pop() || 'jpg';
  const uniqueId = randomUUID().slice(0, 8);
  return `${config.s3.prefix}/projects/${projectId}/${mediaType}/${uniqueId}.${ext}`;
}

/**
 * Get presigned URL for uploading directly from browser
 */
export async function getPresignedUploadUrl(s3Key: string, contentType: string): Promise<{ url: string; expiresIn: number }> {
  try {
    const command = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 minutes
    return { url, expiresIn: 600 };
  } catch (error) {
    console.error('S3 presigned upload error:', error);
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Get presigned URL for downloading/viewing
 */
export async function getPresignedDownloadUrl(s3Key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: s3Key,
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
  } catch (error) {
    console.error('S3 presigned download error:', error);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Check if an S3 object exists
 */
export async function objectExists(s3Key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.s3.bucket, Key: s3Key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the public S3 URL for a key
 */
export function getPublicUrl(s3Key: string): string {
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${s3Key}`;
}

export const s3Service = { generateS3Key, getPresignedUploadUrl, getPresignedDownloadUrl, objectExists, getPublicUrl };
