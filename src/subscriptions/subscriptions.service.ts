import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Plan } from '../plan/entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';

/**
 * Helper function to calculate end date based on billing period unit and value
 * Switch between test mode and production mode using USE_TEST_SUBSCRIPTION_DURATION env var
 */
function calculateEndDate(unit: 'month' | 'year', value: number, useTestDuration: boolean): Date {
  const now = new Date();
  
  if (useTestDuration) {
    // Test mode: Convert to minutes for faster testing
    if (unit === 'month') {
      // 1 month = 1 minute for testing
      now.setMinutes(now.getMinutes() + value);
    } else if (unit === 'year') {
      // 1 year = 5 minutes, 2 years = 10 minutes, 3 years = 15 minutes
      const minutesToAdd = value * 5;
      now.setMinutes(now.getMinutes() + minutesToAdd);
    }
  } else {
    // Production mode: Use real duration
    if (unit === 'month') {
      now.setMonth(now.getMonth() + value);
    } else if (unit === 'year') {
      now.setFullYear(now.getFullYear() + value);
    }
  }
  
  return now;
}

@Injectable()
export class SubscriptionsService {
  private readonly useTestDuration: boolean;

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private plansRepository: Repository<Plan>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private configService: ConfigService,
  ) {
    // Read environment variable to determine if we should use test durations
    // Defaults to false (production mode) if not set
    this.useTestDuration = this.configService.get<string>('USE_TEST_SUBSCRIPTION_DURATION') === 'false';
  }

  async createSubscription(tenant: Tenant, plan: Plan): Promise<Subscription> {
    try {
      // Deactivate all existing active subscriptions for this tenant
      await this.subscriptionRepo
        .createQueryBuilder()
        .update(Subscription)
        .set({ status: 'expired' })
        .where('tenantId = :tenantId', { tenantId: tenant.id })
        .andWhere('status = :status', { status: 'active' })
        .execute();

      const startDate = new Date();
      const endDate = calculateEndDate(plan.billingPeriodUnit, plan.billingPeriodValue, this.useTestDuration);

      const subscription = this.subscriptionRepo.create({
        tenant,
        plan,
        startDate,
        endDate: endDate,
        status: 'active',
      });

      return await this.subscriptionRepo.save(subscription);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id },
      relations: ['plan', 'tenant'],
    });
    if (!subscription) throw new BadRequestException('Subscription not found');

    if (dto.planId) {
      const plan = await this.plansRepository.findOne({
        where: { id: dto.planId },
      });
      if (!plan) throw new BadRequestException('Plan not found');
      subscription.plan = plan;
    }

    if (dto.endDate) subscription.endDate = new Date(dto.endDate);
    
    // If activating this subscription, deactivate all other active subscriptions for this tenant
    if (dto.status === 'active') {
      await this.subscriptionRepo
        .createQueryBuilder()
        .update(Subscription)
        .set({ status: 'expired' })
        .where('tenantId = :tenantId', { tenantId: subscription.tenant.id })
        .andWhere('id != :id', { id })
        .andWhere('status = :status', { status: 'active' })
        .execute();
      subscription.status = 'active';
    } else if (dto.status) {
      subscription.status = dto.status;
    }

    return this.subscriptionRepo.save(subscription);
  }

  async disableSubscription(id: string) {
    const subscription = await this.subscriptionRepo.findOne({ where: { id } });
    if (!subscription) throw new BadRequestException('Subscription not found');

    subscription.status = 'canceled';
    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Get all subscriptions for a tenant
   */
  async getAllSubscriptionsByTenant(tenantId: string): Promise<Subscription[]> {
    const subscriptions = await this.subscriptionRepo.find({
      where: { tenant: { id: tenantId } },
      relations: ['plan', 'tenant'],
      order: { createdAt: 'DESC' }, // Most recent first
    });
    return subscriptions;
  }

  /**
   * Get the active subscription for a tenant
   */
  async getActiveSubscription(tenantId: string): Promise<Subscription | null> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { tenant: { id: tenantId }, status: 'active' },
      relations: ['plan', 'tenant'],
    });
    return subscription || null;
  }

  /**
   * Change subscription (upgrade/downgrade) for a tenant
   * Deactivates current active subscription and creates a new one
   */
  async changeSubscription(tenantId: string, newPlanId: string): Promise<Subscription> {
    // Validate tenant exists
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Validate plan exists
    const plan = await this.plansRepository.findOne({ where: { id: newPlanId } });
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${newPlanId} not found`);
    }

    // Fetch current active subscription
    const currentSubscription = await this.getActiveSubscription(tenantId);

    // If exists, expire it and set endDate to now
    if (currentSubscription) {
      currentSubscription.status = 'expired';
      currentSubscription.endDate = new Date();
      await this.subscriptionRepo.save(currentSubscription);
    }

    // Create new subscription instance
    const now = new Date();
    const newSubscription = this.subscriptionRepo.create({
      tenant,
      plan,
      startDate: now,
      endDate: calculateEndDate(plan.billingPeriodUnit, plan.billingPeriodValue, this.useTestDuration),
      status: 'active',
    });

    // Save and return the new subscription
    return await this.subscriptionRepo.save(newSubscription);
  }
}
