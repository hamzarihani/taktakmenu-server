import { Expose, Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class TenantDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

export class FetchUsersDto {
  @Expose()
  id: string;

  @Expose()
  @IsEmail()
  email?: string;

  @Expose()
  @IsOptional()
  @IsString()
  role?: string;

  @Expose()
  @IsOptional()
  @IsString()
  fullName?: string;

  @Expose()
  @Type(() => TenantDto)
  @IsOptional()
  tenant: TenantDto | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
