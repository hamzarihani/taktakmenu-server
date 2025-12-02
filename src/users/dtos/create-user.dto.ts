import {
  IsDate,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';

export class CreateUserDto {
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

  @IsNotEmpty()
  @Length(6, 6)
  otpCode: string;

  @IsDate()
  otpExpiresAt?: Date;
}
