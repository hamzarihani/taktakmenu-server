import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Tenant } from './entities/tenant.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { JwtUser, PaginationResult } from 'src/common/interfaces';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/users/entities/user.entity';
import { FetchTenantDto } from './dtos/fetch-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    private usersService: UsersService
  ) {}

  async findTenants(
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<Tenant>> {
    const { page, limit, sortBy, sortOrder, search } = paginationDto;
    const offset = (page - 1) * limit;
    console.log("findTenants",page, limit, sortBy, sortOrder, search)

    try {
      const columns = this.tenantsRepository.metadata.columns.map(
        (col) => col.propertyName,
      );

      if (sortBy && !columns.includes(sortBy)) {
        throw new BadRequestException(`Cannot sort by '${sortBy}'`);
      }

      const query = this.tenantsRepository
        .createQueryBuilder('tenant');

      if (search) {
        const searchConditions = columns
          .filter((col) => !['id', 'createdAt', 'updatedAt'].includes(col))
          .map((col) => `CAST(tenant.${col} AS CHAR) LIKE :search`)
          .join(' OR ');

        query.andWhere(`(${searchConditions})`, {
          search: `%${search.toLowerCase()}%`,
        });
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

      const tenants = await query
        .skip(offset)
        .take(limit)
        .orderBy(`tenant.${sortBy || 'createdAt'}`, (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC')
        .getMany();

      const data = plainToInstance(Tenant, tenants, {
        excludeExtraneousValues: true,
      });

      const totalPages = Math.ceil(totalElements / limit);
      const hasNext = page < totalPages;

      return { data, hasNext, totalElements, totalPages };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch tenants');
    }
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { id }
    });
    if (!tenant) throw new NotFoundException(`Tenant with ID ${id} not found`);
    return tenant;
  }

  async findBySubdomain(subdomain: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({
      where: { subdomain }
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with subdomain '${subdomain}' not found`);
    }

    return tenant;
  }

  async createTenant(dto: CreateTenantDto, user: JwtUser): Promise<Tenant> {
    try {
      // 🔍 1️⃣ Check if tenant already exists with same subdomain
      const existingTenant = await this.tenantsRepository.findOne({
        where: { subdomain: dto.subdomain },
      });

      if (existingTenant) {
        throw new ConflictException('Subdomain already in use');
      }

      const existingEmail = await this.tenantsRepository.findOne({
        where: { email: dto.email },
      });

      if (existingEmail) {
        throw new BadRequestException('Tenant with this email already exists.');
      }

      const tenant = this.tenantsRepository.create({
        name: dto.fullName,
        email: dto.email,
        subdomain: dto.subdomain,
        createdBy: { id: user.sub },
      });
      const savedTenant = await this.tenantsRepository.save(tenant);

      await this.usersService.createTenantSuperAdmin({
        email: dto.email,
        password: dto.password,
        fullName: `${dto.fullName} Super Admin`,
        role: UserRole.SUPER_ADMIN,
        otpCode: null,
        isActive: true,
        tenant: savedTenant,
        createdBy: { id: user.sub },
      });

      return savedTenant;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('User with this email already exists.');
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findById(id);
    Object.assign(tenant, data);
    return this.tenantsRepository.save(tenant);
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.findById(id);
    await this.tenantsRepository.remove(tenant);
  }
}
