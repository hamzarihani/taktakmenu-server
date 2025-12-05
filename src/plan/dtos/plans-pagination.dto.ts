import { IsOptional, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class PlansPaginationDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '') return false;
    }
    if (typeof value === 'boolean') return value;
    // Handle case where enableImplicitConversion converted string to boolean incorrectly
    return Boolean(value);
  })
  @Type(() => Boolean)
  @IsBoolean()
  isArchived?: boolean;
}

