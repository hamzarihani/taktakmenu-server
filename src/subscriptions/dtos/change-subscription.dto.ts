import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeSubscriptionDto {
  @ApiProperty({ example: 'uuid-of-tenant', description: 'Tenant ID' })
  @IsNotEmpty()
  @IsUUID()
  tenantId: string;

  @ApiProperty({ example: 'uuid-of-plan', description: 'New Plan ID' })
  @IsNotEmpty()
  @IsUUID()
  planId: string;
}

