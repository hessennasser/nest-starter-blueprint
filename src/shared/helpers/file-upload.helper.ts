import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FileUploadResult {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  path: string; // absolute path on disk
  relativePath: string; // "uploads/<subfolder>/<filename>" for DB storage
  url: string; // absolute URL for API responses
}

/**
 * Local-disk file storage. Swap the body of `uploadFile` / `deleteUploadedFile`
 * for an S3 client to move to object storage without touching call sites — the
 * `relativePath` you persist and the `FileUrlTransformInterceptor` that turns
 * it back into a URL stay the same.
 */
@Injectable()
export class FileUploadHelper {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.baseUrl = process.env.BACKEND_DOMAIN || 'http://localhost:3000';
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: UploadedFile,
    subfolder = '',
    prefix = 'file',
  ): Promise<FileUploadResult> {
    const ext = path.extname(file.originalname);
    const filename = `${prefix}-${crypto.randomUUID()}${ext}`;
    const dir = subfolder
      ? path.join(this.uploadDir, subfolder)
      : this.uploadDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    const relativePath = (
      subfolder
        ? path.join('uploads', subfolder, filename)
        : path.join('uploads', filename)
    ).replace(/\\/g, '/');

    return {
      filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: filePath,
      relativePath,
      url: `${this.baseUrl}/${relativePath}`,
    };
  }

  /** Delete by the absolute path or the public URL; path-escape safe. */
  deleteUploadedFile(filePathOrUrl?: string | null): boolean {
    if (!filePathOrUrl) return false;
    try {
      const relative = filePathOrUrl.startsWith(this.baseUrl)
        ? filePathOrUrl.slice(this.baseUrl.length).replace(/^\/+/, '')
        : filePathOrUrl.replace(/^\/+/, '');

      const uploadRoot = path.resolve(this.uploadDir);
      const inside = relative.startsWith('uploads/')
        ? relative.slice('uploads/'.length)
        : relative;
      const absolute = path.resolve(uploadRoot, inside);

      if (
        absolute !== uploadRoot &&
        !absolute.startsWith(`${uploadRoot}${path.sep}`)
      ) {
        return false;
      }
      if (fs.existsSync(absolute)) {
        fs.unlinkSync(absolute);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  validateImageFile(file: UploadedFile, maxBytes = 5 * 1024 * 1024): boolean {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowed.includes(file.mimetype) && file.size <= maxBytes;
  }
}

/** Relative path → absolute URL. Already-absolute URLs pass through. */
export function getImageUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (/^https?:\/\//.test(relativePath)) return relativePath;
  const baseUrl = process.env.BACKEND_DOMAIN || 'http://localhost:3000';
  const normalized = relativePath.replace(/^\/+/, '');
  return `${baseUrl}/${normalized}`;
}
