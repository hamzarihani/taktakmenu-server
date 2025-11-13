import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'ADMIN', description: 'User role', enum: UserRole, required: false })
  @IsOptional()
  @IsIn(['USER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN', 'SUPPORT', 'SYS_ADMIN'])
  role?: UserRole;

  @ApiProperty({ example: true, description: 'User active status', required: false })
  @IsOptional()
  isActive?: boolean;
}

