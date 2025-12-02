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
import { PaginationDto } from '../common/dtos/pagination.dto';
import { JwtUser, PaginationResult } from '../common/interfaces';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { UpdateTenantAdminDto } from './dtos/update-tenant-admin.dto';
import * as bcrypt from 'bcrypt';
import { FetchTenantDto, FetchTenantOptimizedDto } from './dtos/fetch-tenant.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { PlansService } from '../plan/plans.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { FileService } from '../file/file.service';
import { ForbiddenException } from '@nestjs/common';
import { UpdateTenantDto } from './dtos/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
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
  ): Promise<PaginationResult<FetchTenantOptimizedDto>> {
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
        .createQueryBuilder('tenant')
        .leftJoinAndSelect('tenant.subscriptions', 'subscriptions')
        .leftJoinAndSelect('subscriptions.plan', 'plan');

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

      // Load logo images and extract active subscription for each tenant
      for (const tenant of tenants) {
        if (tenant.logo) {
          try {
            const logoImage = await this.fileService.findByIdPublic(tenant.logo, false);
            (tenant as any).logo = logoImage;
          } catch (error) {
            (tenant as any).logo = null;
          }
        } else {
          (tenant as any).logo = null;
        }
        
        // Extract active subscription for backward compatibility with DTOs
        if (tenant.subscriptions && Array.isArray(tenant.subscriptions)) {
          const activeSubscription = tenant.subscriptions.find((sub: any) => sub.status === 'active');
          (tenant as any).subscription = activeSubscription || null;
        } else {
          (tenant as any).subscription = null;
        }
      }

      const data = plainToInstance(FetchTenantOptimizedDto, tenants, {
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

  async createTenant(dto: CreateTenantDto, user: JwtUser): Promise<FetchTenantOptimizedDto> {
    let savedTenant: Tenant | null = null;
    
    try {
      // 🔍 1️⃣ Check if tenant already exists with same subdomain
      const existingTenant = await this.tenantsRepository.findOne({ where: { subdomain: dto.subdomain } });
      if (existingTenant) throw new ConflictException('Subdomain already in use');

      const existingEmail = await this.tenantsRepository.findOne({ where: { email: dto.email } });
      if (existingEmail) throw new BadRequestException('Tenant with this email already exists.');

      // Create and save tenant
      const tenant = this.tenantsRepository.create({
        name: dto.fullName,
        email: dto.email,
        subdomain: dto.subdomain,
        phone: dto.phone,
        createdBy: { id: user.sub },
      });
      savedTenant = await this.tenantsRepository.save(tenant);

      // Try to create super admin user - if this fails, we'll rollback
      try {
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
      } catch (userError: any) {
        // Rollback: Delete the tenant if user creation fails
        if (savedTenant) {
          try {
            await this.tenantsRepository.remove(savedTenant);
          } catch (rollbackError) {
            console.error('Failed to rollback tenant deletion:', rollbackError);
          }
        }
        
        // Extract detailed error information
        const errorCode = userError.code || userError.errno;
        const errorMessage = userError.message || 'Unknown error';
        const errorSqlMessage = userError.sqlMessage || '';
        
        // Handle specific database errors
        if (errorCode === '23505' || errorCode === 1062 || errorMessage.includes('Duplicate entry')) {
          const duplicateField = errorSqlMessage.includes('email') || errorMessage.includes('email')
            ? 'email'
            : errorSqlMessage.includes('IDX_') 
              ? 'unique constraint'
              : 'field';
          throw new ConflictException(
            `User with this ${duplicateField} already exists. Tenant creation has been rolled back.`
          );
        }
        
        // Handle validation errors
        if (userError instanceof BadRequestException) {
          throw new BadRequestException(
            `Failed to create super admin user: ${userError.message}. Tenant creation has been rolled back.`
          );
        }
        
        if (userError instanceof ConflictException) {
          throw new ConflictException(
            `${userError.message} Tenant creation has been rolled back.`
          );
        }
        
        // Handle other known error codes
        if (errorCode === 'ER_DUP_ENTRY' || errorCode === 1062) {
          throw new ConflictException(
            `Duplicate entry detected: ${errorSqlMessage || errorMessage}. Tenant creation has been rolled back.`
          );
        }
        
        // Log full error for debugging
        console.error('Error creating super admin user:', {
          code: errorCode,
          message: errorMessage,
          sqlMessage: errorSqlMessage,
          stack: userError.stack,
        });
        
        // Return detailed error message
        throw new BadRequestException(
          `Failed to create super admin user. Reason: ${errorMessage}${errorSqlMessage ? ` (${errorSqlMessage})` : ''}. Tenant creation has been rolled back.`
        );
      }

      // Create subscription if plan is provided
      const plan = await this.plansService.findById(dto.planId);
      if (plan) {
        try {
          await this.subscriptionsService.createSubscription(savedTenant, plan);
        } catch (subscriptionError: any) {
          // If subscription creation fails, log but don't rollback (user and tenant are already created)
          console.error('Failed to create subscription:', subscriptionError);
          // Continue without subscription - tenant and user are already created
        }
      }

      // Reload tenant with subscriptions relation
      const tenantWithRelations = await this.tenantsRepository.findOne({
        where: { id: savedTenant.id },
        relations: ['subscriptions', 'subscriptions.plan'],
      });

      // Extract active subscription for backward compatibility with DTOs
      if (tenantWithRelations && tenantWithRelations.subscriptions) {
        const activeSubscription = tenantWithRelations.subscriptions.find((sub) => sub.status === 'active');
        (tenantWithRelations as any).subscription = activeSubscription || null;
      }

      return plainToInstance(FetchTenantOptimizedDto, tenantWithRelations, {
        excludeExtraneousValues: true,
      });
    } catch (error: any) {
      // Re-throw known exceptions (they already have detailed messages)
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Extract error details
      const errorCode = error.code || error.errno;
      const errorMessage = error.message || 'Unknown error';
      const errorSqlMessage = error.sqlMessage || '';
      
      // Handle database errors
      if (errorCode === '23505' || errorCode === 1062 || errorCode === 'ER_DUP_ENTRY') {
        const duplicateField = errorSqlMessage?.includes('email')
          ? 'email'
          : errorSqlMessage?.includes('subdomain')
            ? 'subdomain'
            : 'unique constraint';
        throw new ConflictException(
          `Duplicate entry detected for ${duplicateField}: ${errorSqlMessage || errorMessage}. Please use a different value.`
        );
      }
      
      // If tenant was created but something else failed, try to clean up
      if (savedTenant) {
        try {
          await this.tenantsRepository.remove(savedTenant);
          console.log('Tenant rolled back due to error');
        } catch (cleanupError: any) {
          console.error('Failed to cleanup tenant during rollback:', {
            error: cleanupError.message,
            tenantId: savedTenant.id,
          });
        }
      }
      
      // Log full error for debugging
      console.error('Error creating tenant:', {
        code: errorCode,
        message: errorMessage,
        sqlMessage: errorSqlMessage,
        stack: error.stack,
      });
      
      // Return detailed error message
      throw new InternalServerErrorException(
        `Failed to create tenant. Reason: ${errorMessage}${errorSqlMessage ? ` (${errorSqlMessage})` : ''}${errorCode ? ` [Error Code: ${errorCode}]` : ''}.`
      );
    }
  }

  async updateTenant(
    id: string,
    dto: UpdateTenantAdminDto,
    user: JwtUser,
    logoFile?: Express.Multer.File,
  ): Promise<FetchTenantOptimizedDto> {
    const tenant = await this.findById(id);

    // Role check is done in controller - SYS_ADMIN can update any tenant

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== tenant.email) {
      const existingTenant = await this.tenantsRepository.findOne({ where: { email: dto.email } });
      if (existingTenant) {
        throw new ConflictException('Tenant with this email already exists');
      }
      tenant.email = dto.email;
    }

    // Check subdomain uniqueness if subdomain is being updated
    if (dto.subdomain && dto.subdomain !== tenant.subdomain) {
      const existingTenant = await this.tenantsRepository.findOne({ where: { subdomain: dto.subdomain } });
      if (existingTenant) {
        throw new ConflictException('Subdomain already in use');
      }
      tenant.subdomain = dto.subdomain;
    }

    // Update tenant name (from fullName)
    if (dto.fullName) {
      tenant.name = dto.fullName;
    }

    // Handle logo upload
    if (logoFile) {
      if (tenant.logo) {
        try {
          await this.fileService.deleteImage(tenant.logo, tenant.id);
        } catch (error) {
          // Logo might not be an image ID, ignore error
        }
      }

      const logoImage = await this.fileService.uploadImage(
        logoFile,
        tenant.id,
        user.sub,
        'logos',
      );

      tenant.logo = logoImage.id;
    }

    const savedTenant = await this.tenantsRepository.save(tenant);

    // Update super admin user password if provided
    if (dto.password) {
      const superAdminUser = await this.usersService.findByEmail(tenant.email);
      if (superAdminUser) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);
        await this.usersService.updatePassword(superAdminUser.id, hashedPassword);
      }
    }

    // Update subscription plan if planId is provided
    if (dto.planId) {
      const plan = await this.plansService.findById(dto.planId);
      if (plan) {
        // Create new subscription (will automatically deactivate existing active ones)
        await this.subscriptionsService.createSubscription(tenant, plan);
      }
    }

    // Reload tenant with subscriptions relation
    const tenantWithRelations = await this.tenantsRepository.findOne({
      where: { id: savedTenant.id },
      relations: ['subscriptions', 'subscriptions.plan'],
    });

    // Extract active subscription for backward compatibility with DTOs
    if (tenantWithRelations && tenantWithRelations.subscriptions) {
      const activeSubscription = tenantWithRelations.subscriptions.find((sub) => sub.status === 'active');
      (tenantWithRelations as any).subscription = activeSubscription || null;
    }

    return plainToInstance(FetchTenantOptimizedDto, tenantWithRelations, {
      excludeExtraneousValues: true,
    });
  }

  async updateTenantProfile(
    data: Partial<UpdateTenantDto>,
    user: JwtUser,
    logoFile?: Express.Multer.File,
  ): Promise<FetchTenantDto> {
    if (!user.tenantId) {
      throw new NotFoundException('User must be associated with a tenant');
    }

    const tenant = await this.findById(user.tenantId);

    // Check if user is SUPER_ADMIN and belongs to this tenant
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can update tenant profile');
    }

    // Handle logo upload
    if (logoFile) {
      if (tenant.logo) {
        try {
          await this.fileService.deleteImage(tenant.logo, tenant.id);
        } catch (error) {
          // Logo might not be an image ID, ignore error
        }
      }

      const logoImage = await this.fileService.uploadImage(
        logoFile,
        tenant.id,
        user.sub,
        'logos',
      );

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
    if (data.showInfoToClients !== undefined) {
      // Ensure boolean conversion (handle string "true"/"false" from multipart/form-data)
      const value = data.showInfoToClients;
      if (typeof value === 'string') {
        tenant.showInfoToClients = value === 'true' || value === '1';
      } else {
        tenant.showInfoToClients = Boolean(value);
      }
    }

    const savedTenant = await this.tenantsRepository.save(tenant);

    // Reload tenant with subscriptions relation
    const tenantWithRelations = await this.tenantsRepository.findOne({
      where: { id: savedTenant.id },
      relations: ['subscriptions', 'subscriptions.plan'],
    });

    // Extract active subscription for backward compatibility with DTOs
    if (tenantWithRelations && tenantWithRelations.subscriptions) {
      const activeSubscription = tenantWithRelations.subscriptions.find((sub) => sub.status === 'active');
      (tenantWithRelations as any).subscription = activeSubscription || null;
    }

    return plainToInstance(FetchTenantDto, tenantWithRelations, {
      excludeExtraneousValues: true,
    });
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.findById(id);
    // Delete tenant - CASCADE will automatically delete all related images from database
    await this.tenantsRepository.remove(tenant);
  }
}
