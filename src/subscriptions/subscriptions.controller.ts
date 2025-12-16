import { Controller, Patch, Param, Body, Post, Get, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';
import { ChangeSubscriptionDto } from './dtos/change-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { GetUser } from '../common/get-user-decorator';
import type { JwtUser } from '../common/interfaces';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription details (System Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: 'uuid-of-subscription' })
  @ApiBody({ type: UpdateSubscriptionDto })
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @GetUser() user: JwtUser,
  ) {
    // Only SYS_ADMIN can update subscriptions
    if (user.role !== UserRole.SYS_ADMIN) {
      throw new ForbiddenException('Only system admins can update subscriptions');
    }
    return this.subscriptionsService.updateSubscription(id, dto);
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a subscription (System Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: 'uuid-of-subscription' })
  async disableSubscription(
    @Param('id') id: string,
    @GetUser() user: JwtUser,
  ) {
    // Only SYS_ADMIN can disable subscriptions
    if (user.role !== UserRole.SYS_ADMIN) {
      throw new ForbiddenException('Only system admins can disable subscriptions');
    }
    return this.subscriptionsService.disableSubscription(id);
  }

  @Post('change')
  @ApiOperation({ summary: 'Change tenant subscription (upgrade/downgrade) (System Admin only)' })
  @ApiBody({ type: ChangeSubscriptionDto })
  @ApiResponse({ status: 201, description: 'Subscription changed successfully', type: Subscription })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Tenant or plan not found' })
  async changeSubscription(
    @Body() dto: ChangeSubscriptionDto,
    @GetUser() user: JwtUser,
  ): Promise<Subscription> {
    // Only SYS_ADMIN can change subscriptions
    if (user.role !== UserRole.SYS_ADMIN) {
      throw new ForbiddenException('Only system admins can change subscriptions');
    }
    return this.subscriptionsService.changeSubscription(dto.tenantId, dto.planId);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get all subscriptions for a tenant (System Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'uuid-of-tenant' })
  @ApiResponse({ status: 200, description: 'List of subscriptions for the tenant', type: [Subscription] })
  async getAllSubscriptionsByTenant(
    @Param('tenantId') tenantId: string,
    @GetUser() user: JwtUser,
  ): Promise<Subscription[]> {
    // Only SYS_ADMIN can view subscriptions
    if (user.role !== UserRole.SYS_ADMIN) {
      throw new ForbiddenException('Only system admins can view subscriptions');
    }
    return this.subscriptionsService.getAllSubscriptionsByTenant(tenantId);
  }

  @Get('active/:tenantId')
  @ApiOperation({ summary: 'Get active subscription for a tenant (System Admin only)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'uuid-of-tenant' })
  @ApiResponse({ status: 200, description: 'Active subscription found', type: Subscription })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async getActiveSubscription(
    @Param('tenantId') tenantId: string,
    @GetUser() user: JwtUser,
  ): Promise<Subscription> {
    // Only SYS_ADMIN can view active subscriptions
    if (user.role !== UserRole.SYS_ADMIN) {
      throw new ForbiddenException('Only system admins can view active subscriptions');
    }
    const subscription = await this.subscriptionsService.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException(`No active subscription found for tenant ${tenantId}`);
    }
    return subscription;
  }
}
