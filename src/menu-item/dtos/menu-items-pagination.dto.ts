import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class MenuItemsPaginationDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  categoryId?: string;
}

