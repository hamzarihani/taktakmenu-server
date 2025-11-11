import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Tenant } from './tenant/entities/tenant.entity';
import { Plan } from './plan/entities/plan.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'saas_db',
  entities: [User, Tenant, Plan],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  charset: 'utf8mb4_unicode_ci',
});
