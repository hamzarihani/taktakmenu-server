import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionGuard } from './subscription.guard';
import { SubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { TenantsModule } from '../../tenant/tenants.module';

@Module({
  imports: [
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => TenantsModule),
  ],
  providers: [SubscriptionGuard],
  exports: [SubscriptionGuard],
})
export class GuardsModule {}

