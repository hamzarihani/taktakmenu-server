import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateTenantAdminDto {
  @ApiProperty({ example: 'tenant@example.com', description: 'Tenant email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Tenant Name', description: 'Tenant full name', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'password123', description: 'Super admin password (optional, only updates if provided)', required: false })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'tenant-subdomain', description: 'Tenant subdomain', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
  })
  subdomain?: string;

  @ApiProperty({ example: '+1234567890', description: 'Tenant phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'uuid-of-plan', description: 'ID of the plan to assign to this tenant', required: false })
  @IsOptional()
  @IsUUID()
  planId?: string;
}

