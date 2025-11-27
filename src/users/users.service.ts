import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateUserByAdminDto } from './dtos/create-user-by-admin.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateUserProfileDto } from './dtos/update-user-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { FetchUsersDto } from './dtos/fetch-users.dto';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { CreateTenantSuperAdminDto } from './dtos/create-super-admin.dto';
import { JwtUser } from 'src/common/interfaces';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
      const user = this.usersRepository.create({
        ...dto,
        password: hashedPassword,
      });
      return await this.usersRepository.save(user);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('User with this email already exists.');
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async createTenantSuperAdmin(dto: CreateTenantSuperAdminDto): Promise<User> {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
      const user = this.usersRepository.create({
        ...dto,
        password: hashedPassword,
      });
      return await this.usersRepository.save(user);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('User with this email already exists.');
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async createUserByAdmin(
    dto: CreateUserByAdminDto,
    tenantId: string,
    createdByUserId: string,
  ): Promise<FetchUsersDto> {
    try {
      // Check if email already exists
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

      const user = this.usersRepository.create({
        email: dto.email,
        fullName: dto.fullName,
        password: hashedPassword,
        role: dto.role || UserRole.USER,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        tenant: { id: tenantId },
        createdBy: { id: createdByUserId },
      });

      const savedUser = await this.usersRepository.save(user);

      // Reload user with relations
      const userWithRelations = await this.usersRepository.findOne({
        where: { id: savedUser.id },
        relations: ['tenant', 'createdBy'],
      });

      return plainToInstance(FetchUsersDto, userWithRelations, {
        excludeExtraneousValues: true,
      });
    } catch (error: any) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === '23505') {
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['tenant'] });
  }

  async findById(id: string): Promise<FetchUsersDto> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id },
        relations: ['tenant', 'createdBy'],
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return plainToInstance(FetchUsersDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async findUsers(
    paginationDto: PaginationDto, tenantId: string
  ): Promise<PaginationResult<FetchUsersDto>> {
    const { page, limit, sortBy, sortOrder, search } = paginationDto;

    const offset = (page - 1) * limit;

    try {
      const columns = this.usersRepository.metadata.columns.map(
        (col) => col.propertyName,
      );

      if (!columns.includes(sortBy)) {
        throw new BadRequestException(`Cannot sort by ${sortBy}`);
      }

      const query = this.usersRepository
        .createQueryBuilder('user')
        .where('user.tenantId = :tenantId', { tenantId })
        .leftJoinAndSelect('user.createdBy', 'createdBy');

      if (search) {
        const searchConditions = columns
          .filter((col) => !['id', 'createdAt', 'updatedAt'].includes(col))
          .map((col) => `CAST(user.${col} AS CHAR) LIKE :search`)
          .join(' OR ');

        query.andWhere(`(${searchConditions})`, { search: `%${search.toLowerCase()}%` });
      }

      const totalElements = await query.getCount();

      if (offset >= totalElements) {
        return {
          data: [],
          hasNext: false,
          totalElements,
          totalPages: Math.ceil(totalElements / limit),
        };
      }

      const users = await query
        .skip(offset)
        .take(limit)
        .orderBy(`user.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC')
        .getMany();

      const data = plainToInstance(FetchUsersDto, users, {
        excludeExtraneousValues: true,
      });

      const totalPages = Math.ceil(totalElements / limit);
      const hasNext = page < totalPages;

      return { data, hasNext, totalElements, totalPages };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async activateUser(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      isActive: true,
      otpCode: null,
      otpExpiresAt: null,
    });
  }

  async updatePassword(id: string, hashedPassword: string) {
    return this.usersRepository.update(id, { password: hashedPassword });
  }

  async saveOtp(id: string, otp: string) {
    return this.usersRepository.update(id, {
      otpCode: otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
  }

  async updateUser(id: string, dto: UpdateUserDto, currentUser: JwtUser, tenantId: string): Promise<FetchUsersDto> {
    const user = await this.usersRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Only SUPER_ADMIN or ADMIN can update users
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only super admins and admins can update users');
    }

    // SUPER_ADMIN can update anyone, ADMIN can only update non-SUPER_ADMIN and non-ADMIN users
    if (currentUser.role === UserRole.ADMIN && user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admins cannot update super admin users');
    }

    // Only SUPER_ADMIN can update ADMIN users
    if (currentUser.role === UserRole.ADMIN && user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Only super admins can update admin users');
    }

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.role !== undefined) {
      // Only SUPER_ADMIN can change roles
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only super admins can change user roles');
      }
      user.role = dto.role;
    }
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const updatedUser = await this.usersRepository.save(user);
    return plainToInstance(FetchUsersDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async updateUserProfile(id: string, dto: UpdateUserProfileDto, currentUser: JwtUser): Promise<FetchUsersDto> {
    // Users can only update their own profile
    if (currentUser.sub !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;

    const updatedUser = await this.usersRepository.save(user);
    return plainToInstance(FetchUsersDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, currentUser: JwtUser): Promise<void> {
    // Users can only change their own password
    if (currentUser.sub !== id) {
      throw new ForbiddenException('You can only change your own password');
    }

    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and update new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async deleteUser(id: string, currentUser: JwtUser, tenantId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Only SUPER_ADMIN can delete users
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can delete users');
    }

    // Cannot delete yourself
    if (currentUser.sub === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Cannot delete SUPER_ADMIN users
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete super admin users');
    }

    await this.usersRepository.remove(user);
  }

  async toggleUserStatus(id: string, currentUser: JwtUser, tenantId: string): Promise<FetchUsersDto> {
    const user = await this.usersRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['tenant', 'createdBy'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Only SUPER_ADMIN or ADMIN can toggle user status
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can toggle user status');
    }

    // Cannot toggle your own status
    if (currentUser.sub === id) {
      throw new BadRequestException('You cannot change your own status');
    }

    user.isActive = !user.isActive;
    const updatedUser = await this.usersRepository.save(user);

    // Reload user with relations to ensure createdBy is included
    const userWithRelations = await this.usersRepository.findOne({
      where: { id: updatedUser.id },
      relations: ['tenant', 'createdBy'],
    });

    return plainToInstance(FetchUsersDto, userWithRelations, {
      excludeExtraneousValues: true,
    });
  }

  async getCurrentUserProfile(userId: string): Promise<FetchUsersDto> {
    return this.findById(userId);
  }
}
