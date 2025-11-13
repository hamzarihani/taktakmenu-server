import { UserRole } from '../users/entities/user.entity';

export interface PaginationResult<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface JwtUser {
  sub: string;
  email?: string;
  role: UserRole;
  tenantId?: string;
  iat: number,
  exp: number
}
