import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileUploadService {
  constructor() {}

  /**
   * Validate and process image file
   * @param file - The uploaded file
   * @returns The file buffer and metadata
   */
  async processImage(file: Express.Multer.File): Promise<{ buffer: Buffer; mimeType: string; size: number }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit.');
    }

    // Return file buffer and metadata (no disk storage)
    return {
      buffer: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Optimize image (placeholder for future implementation with sharp or similar)
   * For now, we just validate and store. Can be enhanced with:
   * - Image compression
   * - Resizing
   * - Format conversion
   */
  private async optimizeImage(buffer: Buffer, maxWidth: number = 1920, maxHeight: number = 1080): Promise<Buffer> {
    // TODO: Implement image optimization using sharp or similar library
    // For now, return original buffer
    return buffer;
  }
}

