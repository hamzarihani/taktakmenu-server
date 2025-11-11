import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { TenantsService } from 'src/tenant/tenants.service';

@Module({
  imports: [TypeOrmModule.forFeature([User,Tenant])],
  controllers: [UsersController],
  providers: [UsersService, TenantsService],
  exports: [UsersService],
})
export class UsersModule {}
