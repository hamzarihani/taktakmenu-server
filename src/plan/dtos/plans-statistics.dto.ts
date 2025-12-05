import { ApiProperty } from '@nestjs/swagger';

export class PlansStatisticsDto {
  @ApiProperty({ example: 10, description: 'Total number of plans' })
  totalPlans: number;

  @ApiProperty({ example: 49.99, description: 'Average price of all plans' })
  averagePrice: number;

  @ApiProperty({ example: 'Pro Plan', description: 'Name of the popular plan', nullable: true })
  popularPlanName: string | null;
}

