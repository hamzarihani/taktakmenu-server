import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDecimal, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro Plan', description: 'Plan name (unique)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 49.99, description: 'Price of the plan' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid number with max 2 decimals' })
  @Min(0)
  price: number;

  @ApiProperty({ example: 'USD', description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'month', description: 'Billing period (month/year)', default: 'month' })
  @IsString()
  @IsOptional()
  billingPeriod?: string;

  @ApiProperty({ example: ['Feature A', 'Feature B'], description: 'List of included features' })
  @IsArray()
  @IsNotEmpty()
  features: string[];
}
