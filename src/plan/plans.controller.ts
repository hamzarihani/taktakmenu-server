import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PlansService } from './plans.service';
import { FetchResponse } from '../common/swaggerResponse/tenant-response';
import { PaginationResult } from '../common/interfaces';
import { Plan } from './entities/plan.entity';
import { UpdatePlanDto } from './dtos/update-plan.dto';
import { CreatePlanDto } from './dtos/create-plan.dto';
import { PlansPaginationDto } from './dtos/plans-pagination.dto';
import { PlansStatisticsDto } from './dtos/plans-statistics.dto';

@ApiTags('Plans Controller')
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get all plans (Public)', description: 'Returns non-archived plans by default. Set isArchived=true to include archived plans. No authentication required.' })
  @ApiQuery({ name: 'isArchived', required: false, type: Boolean, description: 'Set to true to include archived plans, omit to get only non-archived plans' })
  @ApiResponse({ status: 200, description: 'Plans fetched successfully', type: [Plan] })
  async getPublicPlans(@Query('isArchived') isArchived?: string): Promise<Plan[]> {
    // Convert string query param to boolean if provided
    // true means include archived plans (all plans), false/undefined means only non-archived
    const includeArchived = isArchived === 'true';
    return this.plansService.findPublicPlans(includeArchived);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get paginated list of plans', description: 'If isArchived is provided, filters by archived status. If omitted, returns all plans (both archived and non-archived). Supports pagination, sorting, and optional search.' })
  @ApiQuery({ name: 'page', required: true, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: true, type: String, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: true, type: String, enum: ['ASC', 'DESC'], description: 'Sort order', example: 'DESC' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string to filter results across tenant fields' })
  @ApiQuery({ name: 'isArchived', required: false, type: Boolean, description: 'Filter by archived status: true for archived only, false for non-archived only. Omit to get all plans.' })
  @ApiResponse(FetchResponse)
  async getAllPlans(
    @Query() paginationDto: PlansPaginationDto,
  ): Promise<PaginationResult<Plan>> {
    if (!paginationDto.page || !paginationDto.limit) {
      throw new BadRequestException('page and limit are required');
    }

    // If isArchived is provided, filter based on its value
    // If isArchived is undefined, show all plans (no filter)
    const isArchived = paginationDto.isArchived;
    return this.plansService.findPlans(paginationDto, isArchived);
  }

  // 🔹 POST: Create new plan
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new plan' })
  @ApiBody({ type: CreatePlanDto })
  async createPlan(@Body() dto: CreatePlanDto): Promise<Plan> {
    return this.plansService.createPlan(dto);
  }

  // 🔹 GET: Get plans statistics (must be before :id route)
  @Get('statistics')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get plans statistics', description: 'Returns total plans count, average price, and popular plan name (only non-archived plans)' })
  @ApiResponse({ status: 200, description: 'Plans statistics fetched successfully', type: PlansStatisticsDto })
  async getPlansStatistics(): Promise<PlansStatisticsDto> {
    return this.plansService.getPlansStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', required: true, description: 'UUID of the plan' })
  @ApiResponse({ status: 200, description: 'Plan fetched successfully', type: Plan })
  async getPlanById(@Param('id') id: string): Promise<Plan> {
    return this.plansService.findById(id);
  }

  // 🔹 PATCH/PUT: Toggle archive status of a plan (must be before :id routes)
  @Patch(':id/archive')
  @Put(':id/archive')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle archive status of a plan', description: 'If plan is archived, it will be unarchived (made active). If plan is active, it will be archived. Supports both PATCH and PUT methods.' })
  @ApiParam({ name: 'id', required: true, example: 'uuid-of-plan' })
  @ApiResponse({ status: 200, description: 'Plan archive status toggled successfully', type: Plan })
  async toggleArchivePlan(@Param('id') id: string): Promise<Plan> {
    return this.plansService.toggleArchivePlan(id);
  }

  // 🔹 PUT: Update existing plan
  @Put(':id')
  @ApiOperation({ summary: 'Update a plan by ID' })
  @ApiParam({ name: 'id', required: true, example: 'uuid-of-plan' })
  @ApiBody({ type: UpdatePlanDto })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto): Promise<Plan> {
    return this.plansService.updatePlan(id, dto);
  }

  // 🔹 DELETE: Remove a plan
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan by ID' })
  @ApiParam({ name: 'id', required: true, example: 'uuid-of-plan' })
  async deletePlan(@Param('id') id: string): Promise<{ message: string }> {
    return this.plansService.deletePlan(id);
  }
}
