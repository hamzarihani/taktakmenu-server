import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginationResult } from '../common/interfaces';
import { FetchResponse } from '../common/swaggerResponse/tenant-response';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { UpdateTenantAdminDto } from './dtos/update-tenant-admin.dto';
import { GetUser } from '../common/get-user-decorator';
import type { JwtUser } from '../common/interfaces';
import { FetchTenantDto, FetchTenantOptimizedDto } from './dtos/fetch-tenant.dto';
import { GetSubdomain } from '../common/get-subdomain-decorator';
import { PublicTenantProfileDto } from './dtos/public-tenant-profile.dto';
import { plainToInstance } from 'class-transformer';
import { UsersService } from '../users/users.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Tenants Controller')
@Controller('tenants')
export class TenantsController {
  constructor(
    private tenantsService: TenantsService,
    private usersService: UsersService,
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

  @Get('public/profile')
  @ApiOperation({ summary: 'Get tenant profile by subdomain (Public)' })
  @ApiResponse({ status: 200, description: 'Tenant profile fetched successfully', type: PublicTenantProfileDto })
  async getTenantProfilePublic(
    @GetSubdomain() subdomain: string,
  ): Promise<PublicTenantProfileDto> {
    const tenant = await this.tenantsService.findBySubdomain(subdomain);
    
    // Transform to public DTO (excludes sensitive info like email, users, etc.)
    return plainToInstance(PublicTenantProfileDto, tenant, {
      excludeExtraneousValues: true,
    });
  }

  // ========== Protected Endpoints (Auth Required) ==========

  @Get('info')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get tenant profile from authenticated user token' })
  @ApiResponse({ status: 200, description: 'Tenant profile fetched successfully', type: Tenant })
  async getTenantProfile(
    @GetUser() user: JwtUser,
  ): Promise<Tenant> {
    const tenantId = await this.getTenantId(user);
    const tenant = await this.tenantsService.findById(tenantId);
    
    return plainToInstance(Tenant, tenant, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get paginated list of tenants', description: 'Returns tenants with pagination, sorting, and optional search.' })
  @ApiQuery({ name: 'page', required: true, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: true, type: String, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: true, type: String, enum: ['ASC', 'DESC'], description: 'Sort order', example: 'DESC' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string to filter results across tenant fields' })
  @ApiResponse(FetchResponse)
  async getAllTenants(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResult<FetchTenantOptimizedDto>> {
    if (!paginationDto.page || !paginationDto.limit) {
      throw new BadRequestException('page and limit are required');
    }

    return this.tenantsService.findTenants(paginationDto);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  async getTenant(@Param('id') id: string): Promise<Tenant> {
    return this.tenantsService.findById(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new tenant (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Tenant created successfully', type: FetchTenantOptimizedDto })
  async createTenant(@Body() dto: CreateTenantDto, @GetUser() user: JwtUser): Promise<FetchTenantOptimizedDto> {
    return this.tenantsService.createTenant(dto, user);
  }

  @Put('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update tenant profile (Super Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiResponse({ status: 200, description: 'Tenant profile updated successfully', type: FetchTenantDto })
  async updateTenantProfile(
    @Req() req: Request,
    @Body() dto: UpdateTenantDto,
    @UploadedFile() logoFile: Express.Multer.File,
    @GetUser() user: JwtUser,
  ): Promise<FetchTenantDto> {
    // Access raw body to get the actual string value before ValidationPipe conversion
    // The enableImplicitConversion might convert "false" string to true boolean
    const rawBody = req.body as any;
    
    // Get the raw value from the request body (before ValidationPipe transformation)
    if (rawBody && 'showInfoToClients' in rawBody) {
      const rawValue = rawBody.showInfoToClients;
      
      // Convert string "false" to boolean false
      if (typeof rawValue === 'string') {
        const lowerValue = rawValue.toLowerCase().trim();
        dto.showInfoToClients = lowerValue === 'true' || lowerValue === '1';
      } else if (typeof rawValue === 'boolean') {
        dto.showInfoToClients = rawValue;
      } else if (rawValue !== undefined && rawValue !== null) {
        // Fallback for other types
        dto.showInfoToClients = rawValue === true || rawValue === 1 || rawValue === '1' || rawValue === 'true';
      }
    }
    return this.tenantsService.updateTenantProfile(dto, user, logoFile);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update tenant by ID (System Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiResponse({ status: 200, description: 'Tenant updated successfully', type: FetchTenantOptimizedDto })
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantAdminDto,
    @UploadedFile() logoFile: Express.Multer.File,
    @GetUser() user: JwtUser,
  ): Promise<FetchTenantOptimizedDto> {
    // Only SYS_ADMIN can update tenants
    if (user.role !== UserRole.SYS_ADMIN) {
      throw new ForbiddenException('Only system admins can update tenants');
    }
    return this.tenantsService.updateTenant(id, dto, user, logoFile);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  async deleteTenant(@Param('id') id: string): Promise<{ message: string }> {
    await this.tenantsService.deleteTenant(id);
    return { message: 'Tenant deleted successfully' };
  }

  @Get('subdomain/:subdomain')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get tenant by subdomain' })
  @ApiResponse({ status: 200, description: 'Tenant fetched successfully', type: Tenant })
  async getTenantBySubdomain(
    @Param('subdomain') subdomain: string,
  ): Promise<Tenant> {
    return this.tenantsService.findBySubdomain(subdomain);
  }
}

