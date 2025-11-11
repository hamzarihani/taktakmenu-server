import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { FetchUsersDto } from './dtos/fetch-users.dto';
import { PaginationResult } from 'src/common/interfaces';
import { TenantsService } from 'src/tenant/tenants.service';

@ApiTags('Users Controller')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService, private tenantsService: TenantsService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // @Post()
  // async createUser(@Body() dto: CreateUserDto) {
  //   return this.usersService.createUser(dto);
  // }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of users', description: 'Returns users with pagination, sorting, and optional search.' })
  @ApiQuery({ name: 'page', required: true, type: Number, description: 'Page number', default: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, description: 'Number of items per page', default: 10 })
  @ApiQuery({ name: 'sortBy', required: true, type: String, description: 'Field to sort by', default: "createdAt" })
  @ApiQuery({ name: 'sortOrder', required: true, type: String, enum: ['ASC', 'DESC'], description: 'Sort order', default: 'DESC' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search string to filter results across all user fields' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@example.com',
            role: 'admin',
            name: 'Hamza Rihani',
            createdAt: '2025-09-14T20:00:00.000Z',
            updatedAt: '2025-09-14T21:00:00.000Z',
          },
        ],
        totalElements: 50,
        totalPages: 5,
        hasNext: true,
      },
    },
  })
  async getUsers(
    @Query() paginationDto: PaginationDto, @Req() req
  ): Promise<PaginationResult<FetchUsersDto>> {

    const tenantId: string = req.user.tenantId;
    if (!tenantId) throw new NotFoundException('Tenant required');

    return this.usersService.findUsers(paginationDto, tenantId);
  }
}
