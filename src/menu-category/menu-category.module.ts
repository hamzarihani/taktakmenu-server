import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuCategoryController } from './menu-category.controller';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategory } from './entities/menu-category.entity';
import { FileModule } from '../file/file.module';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenant/tenants.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuCategory]),
    FileModule,
    UsersModule,
    TenantsModule,
    SubscriptionsModule,
    GuardsModule,
  ],
  controllers: [MenuCategoryController],
  providers: [MenuCategoryService],
  exports: [MenuCategoryService, TypeOrmModule],
})
export class MenuCategoryModule {}

