import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Plan } from './entities/plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { PaginationResult } from '../common/interfaces';
import { CreatePlanDto } from './dtos/create-plan.dto';
import { UpdatePlanDto } from './dtos/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async findPlans(
    paginationDto: PaginationDto,
    isArchived?: boolean,
  ): Promise<PaginationResult<Plan>> {
    const { page, limit, sortBy, sortOrder, search } = paginationDto;
    const offset = (page - 1) * limit;

    try {
      const columns = this.plansRepository.metadata.columns.map(
        (col) => col.propertyName,
      );

      if (sortBy && !columns.includes(sortBy)) {
        throw new BadRequestException(`Cannot sort by '${sortBy}'`);
      }

      const query = this.plansRepository.createQueryBuilder('plan');

      // If isArchived is provided, filter based on its value:
      // - isArchived = false → only active (non-archived) plans
      // - isArchived = true → only archived plans
      // If isArchived is undefined, show all plans (no filter)
      if (isArchived !== undefined) {
        query.andWhere('plan.isArchived = :isArchived', { isArchived });
      }

      if (search) {
        const searchConditions = columns
          .filter((col) => !['id', 'createdAt', 'updatedAt'].includes(col))
          .map((col) => `CAST(plan.${col} AS CHAR) LIKE :search`)
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

      const plans = await query
        .skip(offset)
        .take(limit)
        .orderBy(
          `plan.${sortBy || 'createdAt'}`,
          (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC',
        )
        .getMany();

      const data = plainToInstance(Plan, plans, {
        excludeExtraneousValues: true,
      });

      const totalPages = Math.ceil(totalElements / limit);
      const hasNext = page < totalPages;

      return { data, hasNext, totalElements, totalPages };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to fetch plans');
    }
  }
  async createPlan(dto: CreatePlanDto): Promise<Plan> {
    try {
      const plan = this.plansRepository.create(dto);
      return await this.plansRepository.save(plan);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create plan');
    }
  }

  async findById(id: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) throw new BadRequestException(`Plan with ID ${id} not found`);
    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) throw new BadRequestException('Plan not found');

    Object.assign(plan, dto);
    return this.plansRepository.save(plan);
  }

  async deletePlan(id: string): Promise<{ message: string }> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) throw new BadRequestException('Plan not found');

    // Check if there are any subscriptions using this plan
    const subscriptionsCount = await this.subscriptionRepository.count({
      where: { plan: { id } },
    });

    if (subscriptionsCount > 0) {
      throw new ConflictException(
        `Cannot delete plan. There are ${subscriptionsCount} active subscription(s) using this plan. Please update or delete the subscriptions first.`,
      );
    }

    await this.plansRepository.remove(plan);
    return { message: 'Plan deleted successfully' };
  }

  async findPublicPlans(includeArchived?: boolean): Promise<Plan[]> {
    const queryBuilder = this.plansRepository.createQueryBuilder('plan');

    // By default, only return non-archived plans
    // If includeArchived is true, return all plans (no filter)
    if (!includeArchived) {
      queryBuilder.where('plan.isArchived = :isArchived', { isArchived: false });
    }

    queryBuilder.orderBy('plan.price', 'ASC');

    const plans = await queryBuilder.getMany();
    return plainToInstance(Plan, plans, {
      excludeExtraneousValues: true,
    });
  }

  async toggleArchivePlan(planId: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plan not found');

    // Toggle archived status
    plan.isArchived = !plan.isArchived;
    return await this.plansRepository.save(plan);
  }

  async getPlansStatistics(): Promise<{
    totalPlans: number;
    averagePrice: number;
    popularPlanName: string | null;
  }> {
    try {
      // Get total count of non-archived plans
      const totalPlans = await this.plansRepository.count({
        where: { isArchived: false },
      });

      // Calculate average price of non-archived plans
      const result = await this.plansRepository
        .createQueryBuilder('plan')
        .select('AVG(plan.price)', 'averagePrice')
        .where('plan.isArchived = :isArchived', { isArchived: false })
        .getRawOne();

      const averagePrice = result?.averagePrice
        ? parseFloat(result.averagePrice)
        : 0;

      // Get popular plan name
      const popularPlan = await this.plansRepository.findOne({
        where: { isPopular: true, isArchived: false },
        select: ['name'],
      });

      return {
        totalPlans,
        averagePrice: Math.round(averagePrice * 100) / 100, // Round to 2 decimal places
        popularPlanName: popularPlan?.name || null,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch plans statistics');
    }
  }
}
