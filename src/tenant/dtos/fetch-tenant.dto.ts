import { Expose, Type } from 'class-transformer';
import { FetchUsersDto } from 'src/users/dtos/fetch-users.dto';

export class FetchTenantDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  subdomain: string;

  @Expose()
  logo: string;

  @Expose()
  description: string;

  @Expose()
  address: string;

  @Expose()
  phone: string;

  @Expose()
  email: string;

  @Expose()
  openingHours: string;

  @Expose()
  showInfoToClients: boolean;

  @Expose()
  themeColor: string;

  @Expose()
  @Type(() => FetchUsersDto)
  users: FetchUsersDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
