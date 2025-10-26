import { Expose } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';

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
  name?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
