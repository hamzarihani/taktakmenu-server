import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto } from './dtos/create-menu-item.dto';
import { UpdateMenuItemDto } from './dtos/update-menu-item.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginationResult } from '../common/interfaces';
import { FileService } from '../file/file.service';
import { Image } from '../file/entities/image.entity';
import { plainToInstance } from 'class-transformer';
import { MenuCategoryService } from '../menu-category/menu-category.service';
import { MenuCategory } from '../menu-category/entities/menu-category.entity';
import { FetchMenuItemDto } from './dtos/fetch-menu-item.dto';

@Injectable()
export class MenuItemService {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    private fileService: FileService,
    @Inject(forwardRef(() => MenuCategoryService))
    private menuCategoryService: MenuCategoryService,
  ) {}

  async createItem(
    dto: CreateMenuItemDto,
    tenantId: string,
    userId: string,
    imageFile?: Express.Multer.File,
  ): Promise<FetchMenuItemDto> {
    try {
      // Verify category exists and belongs to tenant
      const category = await this.menuCategoryService.findCategoryById(dto.categoryId, tenantId);

      let image: Image | null = null;

      if (imageFile) {
        image = await this.fileService.uploadImage(imageFile, tenantId, userId, 'items');
      }

      const item = this.menuItemRepository.create({
        name: dto.name,
        description: dto.description,
        price: dto.price,
        image,
        category: { id: dto.categoryId },
        categoryId: dto.categoryId,
        tenant: { id: tenantId },
        tenantId,
        createdBy: { id: userId },
      });

      const savedItem = await this.menuItemRepository.save(item);

      // Reload item with relations
      const itemWithRelations = await this.menuItemRepository.findOne({
        where: { id: savedItem.id, tenantId },
        relations: ['image', 'category', 'createdBy'],
      });

      return plainToInstance(FetchMenuItemDto, itemWithRelations, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to create menu item');
    }
  }

  async findItems(
    paginationDto: PaginationDto,
    tenantId: string,
    categoryId?: string,
  ): Promise<PaginationResult<FetchMenuItemDto>> {
    const { page, limit, sortBy, sortOrder, search } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      const columns = this.menuItemRepository.metadata.columns.map(
        (col) => col.propertyName,
      );

      if (sortBy && !columns.includes(sortBy)) {
        throw new BadRequestException(`Cannot sort by '${sortBy}'`);
      }

      // Build base query conditions for both count and data queries
      const countQuery = this.menuItemRepository
        .createQueryBuilder('item')
        .where('item.tenantId = :tenantId', { tenantId });

      const dataQuery = this.menuItemRepository
        .createQueryBuilder('item')
        .where('item.tenantId = :tenantId', { tenantId })
        .leftJoinAndSelect('item.category', 'category')
        .leftJoinAndSelect('item.image', 'image')
        .leftJoinAndSelect('item.createdBy', 'createdBy');

      if (categoryId) {
        countQuery.andWhere('item.categoryId = :categoryId', { categoryId });
        dataQuery.andWhere('item.categoryId = :categoryId', { categoryId });
      }

      if (search) {
        const searchConditions = columns
          .filter((col) => !['id', 'createdAt', 'updatedAt', 'tenantId', 'categoryId'].includes(col))
          .map((col) => `CAST(item.${col} AS CHAR) LIKE :search`)
          .join(' OR ');

        countQuery.andWhere(`(${searchConditions})`, {
          search: `%${search.toLowerCase()}%`,
        });
        dataQuery.andWhere(`(${searchConditions})`, {
          search: `%${search.toLowerCase()}%`,
        });
      }

      // Execute count query separately (simpler, faster)
      const totalElements = await countQuery.getCount();

      if (offset >= totalElements) {
        return {
          data: [],
          hasNext: false,
          totalElements,
          totalPages: Math.ceil(totalElements / limit),
        };
      }

      // Execute data query with joins and pagination
      const items = await dataQuery
        .skip(offset)
        .take(limit)
        .orderBy(`item.${sortBy || 'createdAt'}`, (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC')
        .getMany();

      const data = plainToInstance(FetchMenuItemDto, items, {
        excludeExtraneousValues: true,
      });

      const totalPages = Math.ceil(totalElements / limit);
      const hasNext = page < totalPages;

      return { data, hasNext, totalElements, totalPages };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // Check for connection errors and provide more helpful error message
      if (error instanceof Error && (error.message.includes('ECONNRESET') || error.message.includes('ECONNREFUSED'))) {
        throw new InternalServerErrorException('Database connection error. Please try again.');
      }
      throw new InternalServerErrorException('Failed to fetch menu items');
    }
  }

  async findAllItemsByCategory(tenantId: string, categoryId: string): Promise<FetchMenuItemDto[]> {
    try {
      const items = await this.menuItemRepository
        .createQueryBuilder('item')
        .where('item.tenantId = :tenantId', { tenantId })
        .andWhere('item.categoryId = :categoryId', { categoryId })
        .leftJoinAndSelect('item.category', 'category')
        .leftJoinAndSelect('item.image', 'image')
        .leftJoinAndSelect('item.createdBy', 'createdBy')
        .orderBy('item.createdAt', 'DESC')
        .getMany();

      return plainToInstance(FetchMenuItemDto, items, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch menu items');
    }
  }

  async findItemById(id: string, tenantId: string): Promise<MenuItem> {
    const item = await this.menuItemRepository.findOne({
      where: { id, tenantId },
      relations: ['category', 'image', 'createdBy'],
    });

    if (!item) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return item;
  }

  async updateItem(
    id: string,
    dto: UpdateMenuItemDto,
    tenantId: string,
    userId: string,
    imageFile?: Express.Multer.File,
  ): Promise<FetchMenuItemDto> {
    const item = await this.findItemById(id, tenantId);

    // Handle category change
    if (dto.categoryId && dto.categoryId !== item.categoryId) {
      // Verify new category exists and belongs to tenant
      await this.menuCategoryService.findCategoryById(dto.categoryId, tenantId);
      item.categoryId = dto.categoryId;
      item.category = { id: dto.categoryId } as MenuCategory;
    }

    // Handle image update
    if (imageFile) {
      // Delete old image if exists
      if (item.image) {
        await this.fileService.deleteImage(item.image.id, tenantId);
      }
      // Upload new image
      item.image = await this.fileService.uploadImage(imageFile, tenantId, userId, 'items');
    }

    // Update other fields
    if (dto.name) item.name = dto.name;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.price !== undefined) item.price = dto.price;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    const savedItem = await this.menuItemRepository.save(item);

    // Reload item with relations
    const itemWithRelations = await this.menuItemRepository.findOne({
      where: { id: savedItem.id, tenantId },
      relations: ['image', 'category', 'createdBy'],
    });

    return plainToInstance(FetchMenuItemDto, itemWithRelations, {
      excludeExtraneousValues: true,
    });
  }

  async deleteItem(id: string, tenantId: string): Promise<void> {
    const item = await this.findItemById(id, tenantId);

    // Delete associated image
    if (item.image) {
      await this.fileService.deleteImage(item.image.id, tenantId);
    }

    await this.menuItemRepository.remove(item);
  }

  async toggleItemStatus(id: string, tenantId: string, isActive: boolean): Promise<FetchMenuItemDto> {
    const item = await this.findItemById(id, tenantId);
    item.isActive = isActive;
    
    const savedItem = await this.menuItemRepository.save(item);

    // Reload item with relations
    const itemWithRelations = await this.menuItemRepository.findOne({
      where: { id: savedItem.id, tenantId },
      relations: ['image', 'category', 'createdBy'],
    });

    return plainToInstance(FetchMenuItemDto, itemWithRelations, {
      excludeExtraneousValues: true,
    });
  }
}

