import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hasSupabaseConfig, hasServiceRoleKey } from '@/lib/supabase/config';
import { ConfigError, BusinessError } from '@/lib/domain/errors';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const RESUME_BUCKET = 'resumes';

export const StorageService = {
  /**
   * Upload a resume file to the Supabase Storage private bucket.
   * Returns the storage path.
   */
  async uploadResume(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string
  ): Promise<{ path: string }> {
    if (!hasSupabaseConfig() || !hasServiceRoleKey()) {
      throw new ConfigError('Storage not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BusinessError(
        'VALIDATION_ERROR',
        `Unsupported file type: ${contentType}. Allowed: PDF, DOC, DOCX.`
      );
    }

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BusinessError(
        'VALIDATION_ERROR',
        `File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB. Max: 10MB.`
      );
    }

    const client = getSupabaseAdmin();
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `resumes/${safeName}`;

    const { error } = await client.storage
      .from(RESUME_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new BusinessError('STORAGE_ERROR', `Upload failed: ${error.message}`);
    }

    return { path: storagePath };
  },

  /**
   * Get a signed URL for downloading a resume (valid for 1 hour).
   */
  async getResumeSignedUrl(storagePath: string): Promise<string> {
    if (!hasSupabaseConfig() || !hasServiceRoleKey()) {
      throw new ConfigError('Storage not configured.');
    }

    const client = getSupabaseAdmin();
    const { data, error } = await client.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) {
      throw new BusinessError('STORAGE_ERROR', `Failed to generate signed URL: ${error?.message ?? 'unknown'}`);
    }

    return data.signedUrl;
  },

  /**
   * Delete a resume from storage.
   */
  async deleteResume(storagePath: string): Promise<void> {
    if (!hasSupabaseConfig() || !hasServiceRoleKey()) {
      throw new ConfigError('Storage not configured.');
    }

    const client = getSupabaseAdmin();
    const { error } = await client.storage
      .from(RESUME_BUCKET)
      .remove([storagePath]);

    if (error) {
      throw new BusinessError('STORAGE_ERROR', `Delete failed: ${error.message}`);
    }
  },
};
