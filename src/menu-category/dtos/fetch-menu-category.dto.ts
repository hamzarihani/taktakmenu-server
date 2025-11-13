import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { User } from 'src/users/entities/user.entity';

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

export class FetchMenuCategoryDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty({ type: () => ImageDto, required: false, nullable: true })
  @Expose()
  @Type(() => ImageDto)
  image?: ImageDto | null;

  @ApiProperty()
  @Expose()
  tenantId: string;

  @ApiProperty({ type: () => UserDto, required: false, nullable: true })
  @Expose()
  @Type(() => UserDto)
  createdBy?: UserDto | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

