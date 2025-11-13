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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { FetchResponse } from 'src/common/swaggerResponse/tenant-response';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantDto } from './dtos/update-tenant.dto';
import { GetUser } from 'src/common/get-user-decorator';
import type { JwtUser } from 'src/common/interfaces';
import { FetchTenantDto } from './dtos/fetch-tenant.dto';
import { GetSubdomain } from 'src/common/get-subdomain-decorator';
import { PublicTenantProfileDto } from './dtos/public-tenant-profile.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Tenants Controller')
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

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
  ): Promise<PaginationResult<Tenant>> {
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
  async createTenant(@Body() dto: CreateTenantDto, @GetUser() user: JwtUser): Promise<Tenant> {
    return this.tenantsService.createTenant(dto, user);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update tenant profile (Super Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiResponse({ status: 200, description: 'Tenant updated successfully', type: Tenant })
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @UploadedFile() logoFile: Express.Multer.File,
    @GetUser() user: JwtUser,
  ): Promise<Tenant> {
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
