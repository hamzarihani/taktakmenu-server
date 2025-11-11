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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { FetchResponse } from 'src/common/swaggerResponse/tenant-response';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { GetUser } from 'src/common/get-user-decorator';
import type { JwtUser } from 'src/common/interfaces';
import { FetchTenantDto } from './dtos/fetch-tenant.dto';

@ApiTags('Tenants Controller')
@ApiBearerAuth('access-token')
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
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
  async getTenant(@Param('id') id: string): Promise<Tenant> {
    return this.tenantsService.findById(id);
  }

  @Post()
  async createTenant(@Body() dto: CreateTenantDto, @GetUser() user: JwtUser): Promise<Tenant> {
    return this.tenantsService.createTenant(dto, user);
  }

  @Put(':id')
  async updateTenant(
    @Param('id') id: string,
    @Body() data: Partial<Tenant>,
  ): Promise<Tenant> {
    return this.tenantsService.updateTenant(id, data);
  }

  @Delete(':id')
  async deleteTenant(@Param('id') id: string): Promise<{ message: string }> {
    await this.tenantsService.deleteTenant(id);
    return { message: 'Tenant deleted successfully' };
  }

  @Get('subdomain/:subdomain')
  @ApiOperation({ summary: 'Get tenant by subdomain' })
  @ApiResponse({ status: 200, description: 'Tenant fetched successfully', type: Tenant })
  async getTenantBySubdomain(
    @Param('subdomain') subdomain: string,
  ): Promise<Tenant> {
    return this.tenantsService.findBySubdomain(subdomain);
  }
}
