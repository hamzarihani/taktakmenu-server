import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { FetchUsersDto } from './dtos/fetch-users.dto';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { CreateTenantSuperAdminDto } from './dtos/create-super-admin.dto';

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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email }, relations: ['tenant'] });
  }

  async findById(id: string): Promise<FetchUsersDto> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id },
        relations: ['tenant'],
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

      const query = this.usersRepository.createQueryBuilder('user').where('user.tenantId = :tenantId', { tenantId });

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
}
