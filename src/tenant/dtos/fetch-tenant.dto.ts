import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { FetchUsersDto } from 'src/users/dtos/fetch-users.dto';

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

class PlanDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  price: number;

  @ApiProperty({ enum: ['month', 'year'] })
  @Expose()
  billingPeriodUnit: 'month' | 'year';

  @ApiProperty()
  @Expose()
  billingPeriodValue: number;
}

class SubscriptionDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ type: () => PlanDto })
  @Expose()
  @Type(() => PlanDto)
  plan: PlanDto;

  @ApiProperty()
  @Expose()
  startDate: Date;

  @ApiProperty()
  @Expose()
  endDate: Date;

  @ApiProperty({ enum: ['active', 'expired', 'canceled', 'pending', 'trialing', 'unpaid'] })
  @Expose()
  status: string;
}

export class FetchTenantDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  subdomain: string;

  @ApiProperty({ type: () => ImageDto, required: false, nullable: true })
  @Expose()
  @Type(() => ImageDto)
  logo?: ImageDto | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  description?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  address?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  phone?: string | null;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  openingHours?: string | null;

  @ApiProperty()
  @Expose()
  showInfoToClients: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  themeColor?: string | null;

  @ApiProperty({ type: () => [FetchUsersDto] })
  @Expose()
  @Type(() => FetchUsersDto)
  users: FetchUsersDto[];

  @ApiProperty({ type: () => SubscriptionDto, required: false, nullable: true })
  @Expose()
  @Type(() => SubscriptionDto)
  subscription?: SubscriptionDto | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}

export class FetchTenantOptimizedDto {
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
  description?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  address?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  phone?: string | null;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ type: () => SubscriptionDto, required: false, nullable: true })
  @Expose()
  @Type(() => SubscriptionDto)
  subscription?: SubscriptionDto | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
