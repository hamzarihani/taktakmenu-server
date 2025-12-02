import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuCategoryController } from './menu-category.controller';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategory } from './entities/menu-category.entity';
import { FileModule } from '../file/file.module';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenant/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuCategory]),
    FileModule,
    UsersModule,
    TenantsModule,
  ],
  controllers: [MenuCategoryController],
  providers: [MenuCategoryService],
  exports: [MenuCategoryService, TypeOrmModule],
})
export class MenuCategoryModule {}

