import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategory } from './entities/menu-category.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { CreateMenuCategoryDto } from './dtos/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dtos/update-menu-category.dto';
import { GetUser } from 'src/common/get-user-decorator';
import type { JwtUser } from 'src/common/interfaces';
import { UsersService } from 'src/users/users.service';
import { FetchMenuCategoryDto } from './dtos/fetch-menu-category.dto';
import { GetSubdomain } from 'src/common/get-subdomain-decorator';
import { TenantsService } from 'src/tenant/tenants.service';

@ApiTags('Menu Category Controller')
@Controller('menu-categories')
export class MenuCategoryController {
  constructor(
    private menuCategoryService: MenuCategoryService,
    private usersService: UsersService,
    private tenantsService: TenantsService,
  ) {}

  // Helper method to get tenantId from user
  private async getTenantId(user: JwtUser): Promise<string> {
    // First try to get from JWT payload
    if (user.tenantId) {
      return user.tenantId;
    }
    // Fallback: load from user entity
    const userEntity = await this.usersService.findById(user.sub);
    if (!userEntity.tenant?.id) {
      throw new NotFoundException('User must be associated with a tenant');
    }
    return userEntity.tenant.id;
  }

  // ========== Public Endpoints (No Auth Required) ==========

  @Get('public')
  @ApiOperation({ summary: 'Get all menu categories by subdomain (Public)' })
  @ApiResponse({ status: 200, description: 'Categories fetched successfully', type: [FetchMenuCategoryDto] })
  async getCategoriesPublic(
    @GetSubdomain() subdomain: string,
  ): Promise<FetchMenuCategoryDto[]> {
    const tenant = await this.tenantsService.findBySubdomain(subdomain);
    return this.menuCategoryService.findAllCategories(tenant.id);
  }

  // ========== Protected Endpoints (Auth Required) ==========

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new menu category' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiResponse({ status: 201, description: 'Category created successfully', type: FetchMenuCategoryDto })
  async createCategory(
    @Body() dto: CreateMenuCategoryDto,
    @UploadedFile() imageFile: Express.Multer.File,
    @GetUser() user: JwtUser,
  ): Promise<FetchMenuCategoryDto> {
    const tenantId = await this.getTenantId(user);
    return this.menuCategoryService.createCategory(dto, tenantId, user.sub, imageFile);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get paginated list of menu categories' })
  @ApiQuery({ name: 'page', required: true, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: true, type: String, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: true, type: String, enum: ['ASC', 'DESC'], description: 'Sort order', example: 'DESC' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string' })
  @ApiResponse({ status: 200, description: 'Categories fetched successfully' })
  async getCategories(
    @Query() paginationDto: PaginationDto,
    @GetUser() user: JwtUser,
  ): Promise<PaginationResult<FetchMenuCategoryDto>> {
    if (!paginationDto.page || !paginationDto.limit) {
      throw new BadRequestException('page and limit are required');
    }
    const tenantId = await this.getTenantId(user);
    return this.menuCategoryService.findCategories(paginationDto, tenantId);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a menu category by ID' })
  @ApiResponse({ status: 200, description: 'Category fetched successfully', type: MenuCategory })
  async getCategory(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<MenuCategory> {
    const tenantId = await this.getTenantId(user);
    return this.menuCategoryService.findCategoryById(id, tenantId);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a menu category' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiResponse({ status: 200, description: 'Category updated successfully', type: FetchMenuCategoryDto })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMenuCategoryDto,
    @UploadedFile() imageFile: Express.Multer.File,
    @GetUser() user: JwtUser,
  ): Promise<FetchMenuCategoryDto> {
    const tenantId = await this.getTenantId(user);
    return this.menuCategoryService.updateCategory(id, dto, tenantId, user.sub, imageFile);
  }

  @Patch(':id/toggle')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable or disable a menu category' })
  @ApiQuery({ name: 'action', required: true, enum: ['enable', 'disable'], description: 'Action to perform: enable or disable' })
  @ApiResponse({ status: 200, description: 'Category status updated successfully', type: FetchMenuCategoryDto })
  async toggleCategory(
    @Param('id') id: string,
    @Query('action') action: 'enable' | 'disable',
    @GetUser() user: JwtUser,
  ): Promise<FetchMenuCategoryDto> {
    if (action !== 'enable' && action !== 'disable') {
      throw new BadRequestException('Action must be either "enable" or "disable"');
    }
    const tenantId = await this.getTenantId(user);
    const isActive = action === 'enable';
    return this.menuCategoryService.toggleCategoryStatus(id, tenantId, isActive);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a menu category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<{ message: string }> {
    const tenantId = await this.getTenantId(user);
    await this.menuCategoryService.deleteCategory(id, tenantId);
    return { message: 'Category deleted successfully' };
  }
}

