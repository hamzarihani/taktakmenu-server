import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserByAdminDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ 
    example: 'ADMIN', 
    enum: ['USER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN', 'SUPPORT'],
    required: false,
    description: 'User role. Defaults to USER if not provided.'
  })
  @IsOptional()
  @IsIn(['USER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN', 'SUPPORT'])
  role?: UserRole;

  @ApiProperty({ example: true, required: false, description: 'Whether the user is active. Defaults to true.', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

