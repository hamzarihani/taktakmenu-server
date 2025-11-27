import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from './entities/image.entity';
import { FileUploadService } from './services/file-upload.service';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(Image)
    private imageRepository: Repository<Image>,
    private fileUploadService: FileUploadService,
  ) {}

  /**
   * Upload and create an image record (stores image data in database as BLOB)
   */
  async uploadImage(
    file: Express.Multer.File,
    tenantId: string,
    userId: string,
    folder: string = 'images',
  ): Promise<Image> {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Process and validate file (returns buffer and metadata)
      const { buffer, mimeType, size } = await this.fileUploadService.processImage(file);

      // Create image record in database with binary data
      const image = this.imageRepository.create({
        data: buffer,
        originalName: file.originalname,
        mimeType,
        size,
        tenant: { id: tenantId },
        tenantId,
        createdBy: { id: userId },
      });

      return await this.imageRepository.save(image);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  /**
   * Get image by ID without tenant validation (for public access)
   */
  async findByIdPublic(id: string, includeData: boolean = true): Promise<Image> {
    const image = await this.imageRepository.findOne({
      where: { id },
      relations: ['tenant', 'createdBy'],
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  /**
   * Get image by ID (with tenant validation)
   */
  async findById(id: string, tenantId: string, includeData: boolean = true): Promise<Image> {
    // When includeData is false, use query builder to exclude the data field
    if (!includeData) {
      const image = await this.imageRepository
        .createQueryBuilder('image')
        .leftJoinAndSelect('image.tenant', 'tenant')
        .leftJoinAndSelect('image.createdBy', 'createdBy')
        .select([
          'image.id',
          'image.originalName',
          'image.mimeType',
          'image.size',
          'image.tenantId',
          'image.createdAt',
          'image.updatedAt',
          'tenant.id',
          'createdBy.id',
        ])
        .where('image.id = :id', { id })
        .andWhere('image.tenantId = :tenantId', { tenantId })
        .getOne();

      if (!image) {
        throw new NotFoundException(`Image with ID ${id} not found`);
      }

      return image;
    }

    // When includeData is true, load all fields including data
    const image = await this.imageRepository.findOne({
      where: { id, tenantId },
      relations: ['tenant', 'createdBy'],
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return image;
  }

  /**
   * Get all images for a tenant
   */
  async findByTenant(tenantId: string, includeData: boolean = false): Promise<Image[]> {
    // When includeData is false, use query builder to exclude the data field for better performance
    if (!includeData) {
      return this.imageRepository
        .createQueryBuilder('image')
        .leftJoinAndSelect('image.createdBy', 'createdBy')
        .select([
          'image.id',
          'image.originalName',
          'image.mimeType',
          'image.size',
          'image.tenantId',
          'image.createdAt',
          'image.updatedAt',
          'createdBy.id',
        ])
        .where('image.tenantId = :tenantId', { tenantId })
        .orderBy('image.createdAt', 'DESC')
        .getMany();
    }

    // When includeData is true, load all fields including data
    return this.imageRepository.find({
      where: { tenantId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete an image (database record only, data is stored in DB)
   */
  async deleteImage(id: string, tenantId: string): Promise<void> {
    const image = await this.findById(id, tenantId);
    // Delete database record (image data is stored in DB, so no file to delete)
    await this.imageRepository.remove(image);
  }

  /**
   * Delete all images for a tenant (used when tenant is deleted)
   * CASCADE will handle this automatically, but this method is kept for manual cleanup if needed
   */
  async deleteByTenant(tenantId: string): Promise<void> {
    const images = await this.findByTenant(tenantId);
    // Delete all database records (image data is stored in DB, so no files to delete)
    if (images.length > 0) {
      await this.imageRepository.remove(images);
    }
  }

  /**
   * Get image data buffer from database
   */
  getImageData(image: Image): Buffer {
    return image.data;
  }
}

