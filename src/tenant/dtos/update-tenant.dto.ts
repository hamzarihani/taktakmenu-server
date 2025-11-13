import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateTenantDto {
  @ApiProperty({ example: 'Restaurant Name', description: 'Tenant name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Restaurant description', description: 'Tenant description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '123 Main St', description: 'Tenant address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '+1234567890', description: 'Tenant phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Mon-Fri: 9AM-5PM', description: 'Opening hours', required: false })
  @IsOptional()
  @IsString()
  openingHours?: string;

  @ApiProperty({ example: '#FF5733', description: 'Theme color', required: false })
  @IsOptional()
  @IsString()
  themeColor?: string;

  @ApiProperty({ example: true, description: 'Show info to clients', required: false })
  @IsOptional()
  @IsBoolean()
  showInfoToClients?: boolean;

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Tenant logo file' })
  @IsOptional()
  logo?: any; // This is only for Swagger documentation, actual file is handled by @UploadedFile()
}

