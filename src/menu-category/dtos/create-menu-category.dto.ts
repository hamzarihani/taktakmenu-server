import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateMenuCategoryDto {
  @ApiProperty({ example: 'Appetizers', description: 'Category name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Delicious starters to begin your meal', description: 'Category description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Category image file' })
  @IsOptional()
  image?: any; // This is only for Swagger documentation, actual file is handled by @UploadedFile()
}

