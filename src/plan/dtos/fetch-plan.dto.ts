// dtos/fetch-plan.dto.ts
import { Expose } from 'class-transformer';

export class FetchPlanDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  price: number;

  @Expose()
  currency: string;

  @Expose()
  billingPeriod: string;

  @Expose()
  features: string[];
}
