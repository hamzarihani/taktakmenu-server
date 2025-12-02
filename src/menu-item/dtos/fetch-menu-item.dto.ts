import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

class ImageDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  originalName: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  mimeType: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  size: number | null;
}

class UserDto {
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

class CategoryDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;
}

export class FetchMenuItemDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty()
  @Expose()
  price: number;

  @ApiProperty()
  @Expose()
  isActive: boolean;

  @ApiProperty({ type: () => ImageDto, required: false, nullable: true })
  @Expose()
  @Type(() => ImageDto)
  image?: ImageDto | null;

  @ApiProperty({ type: () => CategoryDto })
  @Expose()
  @Type(() => CategoryDto)
  category: CategoryDto;

  @ApiProperty()
  @Expose()
  tenantId: string;

  @ApiProperty({ type: () => UserDto })
  @Expose()
  @Type(() => UserDto)
  createdBy: UserDto;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

