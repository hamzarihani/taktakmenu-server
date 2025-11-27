import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
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
import { FetchTenantDto } from './dtos/fetch-tenant.dto';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/users/entities/user.entity';
import { PlansService } from 'src/plan/plans.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { FileService } from 'src/file/file.service';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => PlansService))
    private plansService: PlansService,
    @Inject(forwardRef(() => SubscriptionsService))
    private subscriptionsService: SubscriptionsService,
    private fileService: FileService,
  ) {}

  async findTenants(
    paginationDto: PaginationDto,
  ): Promise<PaginationResult<Tenant>> {
    const { page, limit, sortBy, sortOrder, search } = paginationDto;
    const offset = (page - 1) * limit;

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

    // Load logo image if exists and replace logo string with image object for DTO transformation
    if (tenant.logo) {
      try {
        const logoImage = await this.fileService.findByIdPublic(tenant.logo, false);
        // Replace logo string with image object for DTO transformation
        (tenant as any).logo = logoImage;
      } catch (error) {
        // Image not found, set logo to null
        (tenant as any).logo = null;
      }
    } else {
      (tenant as any).logo = null;
    }

    return tenant;
  }

  async createTenant(dto: CreateTenantDto, user: JwtUser): Promise<Tenant> {
    try {
      // 🔍 1️⃣ Check if tenant already exists with same subdomain
      const existingTenant = await this.tenantsRepository.findOne({ where: { subdomain: dto.subdomain } });
      if (existingTenant) throw new ConflictException('Subdomain already in use');

      const existingEmail = await this.tenantsRepository.findOne({ where: { email: dto.email } });
      if (existingEmail) throw new BadRequestException('Tenant with this email already exists.');

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

      const plan = await this.plansService.findById(dto.planId);
      if (plan) {
        await this.subscriptionsService.createSubscription(savedTenant, plan);
      }

      return savedTenant;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('User with this email already exists.');
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async updateTenant(
    id: string,
    data: Partial<Tenant>,
    user: JwtUser,
    logoFile?: Express.Multer.File,
  ): Promise<FetchTenantDto> {
    const tenant = await this.findById(id);

    // Check if user is SUPER_ADMIN and belongs to this tenant
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can update tenant profile');
    }

    if (user.tenantId && user.tenantId !== tenant.id) {
      throw new ForbiddenException('You can only update your own tenant profile');
    }

    // Handle logo upload
    if (logoFile) {
      // Delete old logo if exists (if logo is stored as image ID)
      // For now, we'll store the image ID in the logo field
      // You may need to adjust this based on your storage strategy
      if (tenant.logo) {
        try {
          // Try to delete old logo image if it's a valid UUID
          await this.fileService.deleteImage(tenant.logo, tenant.id);
        } catch (error) {
          // Logo might not be an image ID, ignore error
        }
      }

      // Upload new logo
      const logoImage = await this.fileService.uploadImage(
        logoFile,
        tenant.id,
        user.sub,
        'logos',
      );

      // Store image ID in logo field
      tenant.logo = logoImage.id;
    }

    // Update other fields
    if (data.name !== undefined) tenant.name = data.name;
    if (data.email !== undefined) tenant.email = data.email;
    if (data.description !== undefined) tenant.description = data.description;
    if (data.address !== undefined) tenant.address = data.address;
    if (data.phone !== undefined) tenant.phone = data.phone;
    if (data.openingHours !== undefined) tenant.openingHours = data.openingHours;
    if (data.themeColor !== undefined) tenant.themeColor = data.themeColor;
    if (data.showInfoToClients !== undefined) tenant.showInfoToClients = data.showInfoToClients;

    const savedTenant = await this.tenantsRepository.save(tenant);

    // Load logo image if exists and replace logo string with image object for DTO transformation
    if (savedTenant.logo) {
      try {
        const logoImage = await this.fileService.findByIdPublic(savedTenant.logo, false);
        // Replace logo string with image object for DTO transformation
        (savedTenant as any).logo = logoImage;
      } catch (error) {
        // Image not found, set logo to null
        (savedTenant as any).logo = null;
      }
    } else {
      (savedTenant as any).logo = null;
    }

    return plainToInstance(FetchTenantDto, savedTenant, {
      excludeExtraneousValues: true,
    });
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.findById(id);
    // Delete tenant - CASCADE will automatically delete all related images from database
    await this.tenantsRepository.remove(tenant);
  }
}
