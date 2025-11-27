import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsUUID, Min, IsBoolean } from 'class-validator';

export class UpdateMenuItemDto {
  @ApiProperty({ example: 'Caesar Salad', description: 'Item name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Fresh romaine lettuce with caesar dressing', description: 'Item description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12.99, description: 'Item price', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: true, description: 'Whether the item is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'uuid-of-category', description: 'Category ID', required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Item image file' })
  @IsOptional()
  image?: any; // This is only for Swagger documentation, actual file is handled by @UploadedFile()
}

