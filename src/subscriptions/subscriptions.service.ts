import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Plan } from 'src/plan/entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private plansRepository: Repository<Plan>,
  ) {}

  async createSubscription(tenant: Tenant, plan: Plan): Promise<Subscription> {
    try {
      const startDate = new Date();
      const endDate = new Date(startDate);

      switch (plan.billingPeriod) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }

      const subscription = this.subscriptionRepo.create({
        tenant,
        plan,
        startDate,
        endDate: endDate,
        isActive: true,
      });

      return await this.subscriptionRepo.save(subscription);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id },
      relations: ['plan'],
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
    if (typeof dto.isActive === 'boolean') subscription.isActive = dto.isActive;

    return this.subscriptionRepo.save(subscription);
  }

  async disableSubscription(id: string) {
    const subscription = await this.subscriptionRepo.findOne({ where: { id } });
    if (!subscription) throw new BadRequestException('Subscription not found');

    subscription.isActive = false;
    return this.subscriptionRepo.save(subscription);
  }
}
