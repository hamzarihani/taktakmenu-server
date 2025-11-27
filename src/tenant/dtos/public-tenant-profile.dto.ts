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

export class PublicTenantProfileDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  subdomain: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ type: () => ImageDto, required: false, nullable: true })
  @Expose()
  @Type(() => ImageDto)
  logo?: ImageDto | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  description: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  address: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  phone: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  openingHours: string | null;

  @ApiProperty({ required: false, nullable: false })
  @Expose()
  showInfoToClients: boolean;

  @ApiProperty()
  @Expose()
  themeColor: string | null;
}

