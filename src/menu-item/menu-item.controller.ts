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
import { MenuItemService } from './menu-item.service';
import { MenuItem } from './entities/menu-item.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { CreateMenuItemDto } from './dtos/create-menu-item.dto';
import { UpdateMenuItemDto } from './dtos/update-menu-item.dto';
import { GetUser } from 'src/common/get-user-decorator';
import type { JwtUser } from 'src/common/interfaces';
import { UsersService } from 'src/users/users.service';
import { FetchMenuItemDto } from './dtos/fetch-menu-item.dto';
import { GetSubdomain } from 'src/common/get-subdomain-decorator';
import { TenantsService } from 'src/tenant/tenants.service';

@ApiTags('Menu Item Controller')
@Controller('menu-items')
export class MenuItemController {
  constructor(
    private menuItemService: MenuItemService,
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

  @Get('public/category/:categoryId')
  @ApiOperation({ summary: 'Get all menu items by category ID (Public)' })
  @ApiResponse({ status: 200, description: 'Items fetched successfully', type: [FetchMenuItemDto] })
  async getItemsByCategoryPublic(
    @Param('categoryId') categoryId: string,
    @GetSubdomain() subdomain: string,
  ): Promise<FetchMenuItemDto[]> {
    const tenant = await this.tenantsService.findBySubdomain(subdomain);
    return this.menuItemService.findAllItemsByCategory(tenant.id, categoryId);
  }

  // ========== Protected Endpoints (Auth Required) ==========

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiResponse({ status: 201, description: 'Item created successfully', type: FetchMenuItemDto })
  async createItem(
    @Body() dto: CreateMenuItemDto,
    @UploadedFile() imageFile: Express.Multer.File,
    @GetUser() user: JwtUser,
  ): Promise<FetchMenuItemDto> {
    const tenantId = await this.getTenantId(user);
    return this.menuItemService.createItem(dto, tenantId, user.sub, imageFile);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get paginated list of menu items' })
  @ApiQuery({ name: 'page', required: true, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: true, type: String, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: true, type: String, enum: ['ASC', 'DESC'], description: 'Sort order', example: 'DESC' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiResponse({ status: 200, description: 'Items fetched successfully' })
  async getItems(
    @Query() paginationDto: PaginationDto,
    @Query('categoryId') categoryId: string,
    @GetUser() user: JwtUser,
  ): Promise<PaginationResult<FetchMenuItemDto>> {
    if (!paginationDto.page || !paginationDto.limit) {
      throw new BadRequestException('page and limit are required');
    }
    const tenantId = await this.getTenantId(user);
    return this.menuItemService.findItems(paginationDto, tenantId, categoryId);
  }

  @Get('category/:categoryId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get menu items by category ID' })
  @ApiQuery({ name: 'page', required: true, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: true, type: String, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: true, type: String, enum: ['ASC', 'DESC'], description: 'Sort order', example: 'DESC' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string' })
  @ApiResponse({ status: 200, description: 'Items fetched successfully' })
  async getItemsByCategory(
    @Param('categoryId') categoryId: string,
    @Query() paginationDto: PaginationDto,
    @GetUser() user: JwtUser,
  ): Promise<PaginationResult<FetchMenuItemDto>> {
    if (!paginationDto.page || !paginationDto.limit) {
      throw new BadRequestException('page and limit are required');
    }
    const tenantId = await this.getTenantId(user);
    return this.menuItemService.findItems(paginationDto, tenantId, categoryId);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a menu item by ID' })
  @ApiResponse({ status: 200, description: 'Item fetched successfully', type: MenuItem })
  async getItem(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<MenuItem> {
    const tenantId = await this.getTenantId(user);
    return this.menuItemService.findItemById(id, tenantId);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  @ApiResponse({ status: 200, description: 'Item updated successfully', type: FetchMenuItemDto })
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @UploadedFile() imageFile: Express.Multer.File,
    @GetUser() user: JwtUser,
  ): Promise<FetchMenuItemDto> {
    const tenantId = await this.getTenantId(user);
    return this.menuItemService.updateItem(id, dto, tenantId, user.sub, imageFile);
  }

  @Patch(':id/toggle')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable or disable a menu item' })
  @ApiQuery({ name: 'action', required: true, enum: ['enable', 'disable'], description: 'Action to perform: enable or disable' })
  @ApiResponse({ status: 200, description: 'Item status updated successfully', type: FetchMenuItemDto })
  async toggleItem(
    @Param('id') id: string,
    @Query('action') action: 'enable' | 'disable',
    @GetUser() user: JwtUser,
  ): Promise<FetchMenuItemDto> {
    if (action !== 'enable' && action !== 'disable') {
      throw new BadRequestException('Action must be either "enable" or "disable"');
    }
    const tenantId = await this.getTenantId(user);
    const isActive = action === 'enable';
    return this.menuItemService.toggleItemStatus(id, tenantId, isActive);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  async deleteItem(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<{ message: string }> {
    const tenantId = await this.getTenantId(user);
    await this.menuItemService.deleteItem(id, tenantId);
    return { message: 'Item deleted successfully' };
  }
}

