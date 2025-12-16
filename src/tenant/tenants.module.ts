import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PlansModule } from '../plan/plans.module';
import { FileModule } from '../file/file.module';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Subscription]),
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => PlansModule),
    FileModule,
    GuardsModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
