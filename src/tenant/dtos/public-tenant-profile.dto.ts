import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

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

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  logo: string | null;

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

