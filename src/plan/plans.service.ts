import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Plan } from './entities/plan.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginationResult } from 'src/common/interfaces';
import { CreatePlanDto } from './dtos/create-plan.dto';
import { UpdatePlanDto } from './dtos/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
  ) {}
  
  async findPlans(
      paginationDto: PaginationDto,
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
  
        const query = this.plansRepository
          .createQueryBuilder('plan');
  
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
          .orderBy(`plan.${sortBy || 'createdAt'}`, (sortOrder || 'DESC').toUpperCase() as 'ASC' | 'DESC')
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

async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
  const plan = await this.plansRepository.findOne({ where: { id } });
  if (!plan) throw new BadRequestException('Plan not found');

  Object.assign(plan, dto);
  return this.plansRepository.save(plan);
}

async deletePlan(id: string): Promise<{ message: string }> {
  const plan = await this.plansRepository.findOne({ where: { id } });
  if (!plan) throw new BadRequestException('Plan not found');

  await this.plansRepository.remove(plan);
  return { message: 'Plan deleted successfully' };
}

}