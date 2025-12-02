import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Plan } from 'src/plan/entities/plan.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { PlansModule } from 'src/plan/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Plan, Tenant]), // <-- register repositories
    forwardRef(() => PlansModule),                  // <-- inject PlansService
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
