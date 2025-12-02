import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItemController } from './menu-item.controller';
import { MenuItemService } from './menu-item.service';
import { MenuItem } from './entities/menu-item.entity';
import { FileModule } from '../file/file.module';
import { UsersModule } from '../users/users.module';
import { MenuCategoryModule } from '../menu-category/menu-category.module';
import { TenantsModule } from '../tenant/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuItem]),
    FileModule,
    UsersModule,
    forwardRef(() => MenuCategoryModule),
    TenantsModule,
  ],
  controllers: [MenuItemController],
  providers: [MenuItemService],
  exports: [MenuItemService],
})
export class MenuItemModule {}

