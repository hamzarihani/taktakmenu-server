import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { TenantsService } from '../../tenant/tenants.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly tenantsService: TenantsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Get tenant ID from subdomain or user
    let tenantId: string | null = null;

    // Try to get from subdomain (for public APIs)
    const subdomain = (request as any).tenantSubdomain;
    if (subdomain) {
      try {
        const tenant = await this.tenantsService.findBySubdomain(subdomain);
        tenantId = tenant.id;
      } catch (error) {
        // Subdomain not found, will try user tenant
      }
    }

    // Try to get from authenticated user (for protected APIs)
    if (!tenantId && (request as any).user) {
      const user = (request as any).user;
      if (user.tenantId) {
        tenantId = user.tenantId;
      }
    }

    if (!tenantId) {
      throw new ForbiddenException('Tenant not found. Please provide a valid subdomain or be authenticated.');
    }

    // Check for active subscription
    const subscription = await this.subscriptionsService.getActiveSubscription(tenantId);

    if (!subscription) {
      throw new ForbiddenException('No active subscription found. Please renew your subscription to access this resource.');
    }

    // Check if subscription is expired
    const now = new Date();
    if (subscription.endDate < now) {
      throw new ForbiddenException('Your subscription has expired. Please renew to continue using the service.');
    }

    // Check if subscription status is active
    if (subscription.status !== 'active') {
      throw new ForbiddenException(`Subscription is ${subscription.status}. Please contact support.`);
    }

    return true;
  }
}

