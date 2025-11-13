import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Caesar Salad', description: 'Item name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Fresh romaine lettuce with caesar dressing', description: 'Item description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12.99, description: 'Item price' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'uuid-of-category', description: 'Category ID' })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Item image file' })
  @IsOptional()
  image?: any; // This is only for Swagger documentation, actual file is handled by @UploadedFile()
}

