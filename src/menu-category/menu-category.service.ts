import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategory } from './entities/menu-category.entity';
import { CreateMenuCategoryDto } from './dtos/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dtos/update-menu-category.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { FileService } from 'src/file/file.service';
import { Image } from 'src/file/entities/image.entity';
import { plainToInstance } from 'class-transformer';
import { FetchMenuCategoryDto } from './dtos/fetch-menu-category.dto';

@Injectable()
export class MenuCategoryService {
  constructor(
    @InjectRepository(MenuCategory)
    private menuCategoryRepository: Repository<MenuCategory>,
    private fileService: FileService,
  ) {}

  async createCategory(
    dto: CreateMenuCategoryDto,
    tenantId: string,
    userId: string,
    imageFile?: Express.Multer.File,
  ): Promise<FetchMenuCategoryDto> {
    try {
      let image: Image | null = null;

      if (imageFile) {
        image = await this.fileService.uploadImage(imageFile, tenantId, userId, 'categories');
      }

      const category = this.menuCategoryRepository.create({
        name: dto.name,
        description: dto.description,
        image,
        tenant: { id: tenantId },
        tenantId,
        createdBy: { id: userId },
      });

      const savedCategory = await this.menuCategoryRepository.save(category);

      // Reload category with relations
      const categoryWithRelations = await this.menuCategoryRepository.findOne({
        where: { id: savedCategory.id, tenantId },
        relations: ['image', 'createdBy'],
      });

      // Transform to DTO (DTO will format the data and exclude binary)
      return plainToInstance(FetchMenuCategoryDto, categoryWithRelations, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to create menu category');
    }
  }

  async findCategories(
    paginationDto: PaginationDto,
    tenantId: string,
  ): Promise<PaginationResult<FetchMenuCategoryDto>> {
    const { page, limit, sortBy, sortOrder, search } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      const columns = this.menuCategoryRepository.metadata.columns.map(
        (col) => col.propertyName,
      );

      if (sortBy && !columns.includes(sortBy)) {
        throw new BadRequestException(`Cannot sort by '${sortBy}'`);
      }

      const query = this.menuCategoryRepository
        .createQueryBuilder('category')
        .where('category.tenantId = :tenantId', { tenantId })
        .leftJoinAndSelect('category.image', 'image')
        .leftJoinAndSelect('category.createdBy', 'createdBy');

      if (search) {
        const searchConditions = columns
          .filter((col) => !['id', 'createdAt', 'updatedAt', 'tenantId'].includes(col))
          .map((col) => `CAST(category.${col} AS CHAR) LIKE :search`)
          .join(' OR ');

        query.andWhere(`(${searchConditions})`, {
          search: `%${search.toLowerCase()}%`,
        });
      }

      const totalElements = await query.getCount();

      if (offset >= totalElements) {
        return {
          data: [],
          hasNext: false,
          totalElements,
          totalPages: Math.ceil(totalElements / limit),
        };
      }

      const categories = await query
        .skip(offset)
        .take(limit)
        .orderBy(`category.${sortBy || 'createdAt'}`, (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC')
        .getMany();

      const data = plainToInstance(FetchMenuCategoryDto, categories, {
        excludeExtraneousValues: true,
      });

      const totalPages = Math.ceil(totalElements / limit);
      const hasNext = page < totalPages;

      return { data, hasNext, totalElements, totalPages };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch menu categories');
    }
  }

  async findCategoryById(id: string, tenantId: string): Promise<MenuCategory> {
    const category = await this.menuCategoryRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'image'],
    });

    if (!category) {
      throw new NotFoundException(`Menu category with ID ${id} not found`);
    }

    return category;
  }

  async updateCategory(
    id: string,
    dto: UpdateMenuCategoryDto,
    tenantId: string,
    userId: string,
    imageFile?: Express.Multer.File,
  ): Promise<MenuCategory> {
    const category = await this.findCategoryById(id, tenantId);

    // Handle image update
    if (imageFile) {
      // Delete old image if exists
      if (category.image) {
        await this.fileService.deleteImage(category.image.id, tenantId);
      }
      // Upload new image
      category.image = await this.fileService.uploadImage(imageFile, tenantId, userId, 'categories');
    }

    // Update other fields
    if (dto.name) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;

    return await this.menuCategoryRepository.save(category);
  }

  async deleteCategory(id: string, tenantId: string): Promise<void> {
    const category = await this.findCategoryById(id, tenantId);

    // Delete associated image
    if (category.image) {
      await this.fileService.deleteImage(category.image.id, tenantId);
    }

    // Delete category (cascade will delete items)
    await this.menuCategoryRepository.remove(category);
  }
}

