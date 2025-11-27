import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserByAdminDto } from './dtos/create-user-by-admin.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateUserProfileDto } from './dtos/update-user-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { FetchUsersDto } from './dtos/fetch-users.dto';
import { PaginationResult } from 'src/common/interfaces';
import { TenantsService } from 'src/tenant/tenants.service';
import { GetUser } from 'src/common/get-user-decorator';
import type { JwtUser } from 'src/common/interfaces';
import { UserRole } from './entities/user.entity';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('Users Controller')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService, private tenantsService: TenantsService) {}

  // Helper method to get tenantId from user
  private getTenantId(user: JwtUser): string {
    if (!user.tenantId) {
      throw new NotFoundException('User must be associated with a tenant');
    }
    return user.tenantId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: FetchUsersDto })
  async createUser(
    @Body() dto: CreateUserByAdminDto,
    @GetUser() user: JwtUser,
  ): Promise<FetchUsersDto> {
    // Only SUPER_ADMIN can create users
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can create users');
    }

    const tenantId = this.getTenantId(user);
    return this.usersService.createUserByAdmin(dto, tenantId, user.sub);
  }

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
            fullName: 'Hamza Rihani',
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
    @Query() paginationDto: PaginationDto,
    @GetUser() user: JwtUser,
  ): Promise<PaginationResult<FetchUsersDto>> {
    const tenantId = this.getTenantId(user);
    return this.usersService.findUsers(paginationDto, tenantId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile fetched successfully', type: FetchUsersDto })
  async getCurrentUserProfile(@GetUser() user: JwtUser): Promise<FetchUsersDto> {
    return this.usersService.getCurrentUserProfile(user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: FetchUsersDto })
  async updateUserProfile(
    @Body() dto: UpdateUserProfileDto,
    @GetUser() user: JwtUser,
  ): Promise<FetchUsersDto> {
    return this.usersService.updateUserProfile(user.sub, dto, user);
  }

  @Put('profile/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @GetUser() user: JwtUser,
  ): Promise<{ message: string }> {
    await this.usersService.changePassword(user.sub, dto, user);
    return { message: 'Password changed successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User fetched successfully', type: FetchUsersDto })
  async getUser(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<FetchUsersDto> {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user. Only Super Admin can update Admin users.' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: FetchUsersDto })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @GetUser() user: JwtUser,
  ): Promise<FetchUsersDto> {
    // Only SUPER_ADMIN can update users
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can update users');
    }
    const tenantId = this.getTenantId(user);
    return this.usersService.updateUser(id, dto, user, tenantId);
  }

  @Put(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle user active status (Super Admin/Admin only)' })
  @ApiResponse({ status: 200, description: 'User status toggled successfully', type: FetchUsersDto })
  async toggleUserStatus(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<FetchUsersDto> {
    // Only SUPER_ADMIN can update users
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can update users');
    }
    const tenantId = this.getTenantId(user);
    return this.usersService.toggleUserStatus(id, user, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ): Promise<{ message: string }> {
    const tenantId = this.getTenantId(user);
    await this.usersService.deleteUser(id, user, tenantId);
    return { message: 'User deleted successfully' };
  }
}
