import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class TenantDto {
  @Expose()
  id: string;

  @Expose()
  name: string;
}

class CreatedByDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  fullName: string;

  @ApiProperty()
  @Expose()
  email: string;
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
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: () => CreatedByDto, required: false, nullable: true })
  @Expose()
  @Type(() => CreatedByDto)
  @IsOptional()
  createdBy?: CreatedByDto | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
