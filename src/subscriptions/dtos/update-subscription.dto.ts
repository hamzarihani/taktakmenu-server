import { IsOptional, IsDateString, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiProperty({ example: '2025-12-31T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    example: 'active', 
    enum: ['active', 'expired', 'canceled', 'pending', 'trialing', 'unpaid'],
    required: false 
  })
  @IsOptional()
  @IsIn(['active', 'expired', 'canceled', 'pending', 'trialing', 'unpaid'])
  status?: string;

  @ApiProperty({ example: 'uuid-of-plan', required: false })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
