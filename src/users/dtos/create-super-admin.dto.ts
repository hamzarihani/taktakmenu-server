import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { User, UserRole } from '../entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import type { DeepPartial } from 'typeorm';

export class CreateTenantSuperAdminDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsIn(['USER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN', 'SUPPORT'])
  role?: UserRole;

  @IsOptional()
  tenant?: Tenant;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  createdBy?: DeepPartial<User>;

  @IsNotEmpty()
  @Length(6, 6)
  otpCode: string | null;

  @IsDate()
  otpExpiresAt?: Date;
}
