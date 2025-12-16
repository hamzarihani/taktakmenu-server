import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Plan } from '../plan/entities/plan.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { PlansModule } from '../plan/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Plan, Tenant]), // <-- register repositories
    forwardRef(() => PlansModule),                  // <-- inject PlansService
    ConfigModule, // <-- for ConfigService
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
