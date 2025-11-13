import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PlansService } from './plans.service';
import { FetchResponse } from 'src/common/swaggerResponse/tenant-response';
import { PaginationResult } from 'src/common/interfaces';
import { Plan } from './entities/plan.entity';
import { UpdatePlanDto } from './dtos/update-plan.dto';
import { CreatePlanDto } from './dtos/create-plan.dto';

@ApiTags('Plans Controller')
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get all plans (Public)', description: 'Returns all available plans. No authentication required.' })
  @ApiResponse({ status: 200, description: 'Plans fetched successfully', type: [Plan] })
  async getPublicPlans(): Promise<Plan[]> {
    return this.plansService.findPublicPlans();
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get paginated list of plans', description: 'Returns plans with pagination, sorting, and optional search.' })
  @ApiQuery({ name: 'page', required: true, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: true, type: String, description: 'Field to sort by', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: true, type: String, enum: ['ASC', 'DESC'], description: 'Sort order', example: 'DESC' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string to filter results across tenant fields' })
  @ApiResponse(FetchResponse)
  async getAllPlans(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginationResult<Plan>> {
    if (!paginationDto.page || !paginationDto.limit) {
      throw new BadRequestException('page and limit are required');
    }

    return this.plansService.findPlans(paginationDto);
  }

  // 🔹 POST: Create new plan
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new plan' })
  @ApiBody({ type: CreatePlanDto })
  async createPlan(@Body() dto: CreatePlanDto): Promise<Plan> {
    return this.plansService.createPlan(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', required: true, description: 'UUID of the plan' })
  @ApiResponse({ status: 200, description: 'Plan fetched successfully', type: Plan })
  async getPlanById(@Param('id') id: string): Promise<Plan> {
    return this.plansService.findById(id);
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
