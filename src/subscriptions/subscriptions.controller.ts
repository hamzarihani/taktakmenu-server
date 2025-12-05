import { Controller, Patch, Param, Body, Post, Get, NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';
import { ChangeSubscriptionDto } from './dtos/change-subscription.dto';
import { Subscription } from './entities/subscription.entity';

@ApiTags('Subscriptions')
@ApiBearerAuth('access-token')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription details' })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: 'uuid-of-subscription' })
  @ApiBody({ type: UpdateSubscriptionDto })
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto
  ) {
    return this.subscriptionsService.updateSubscription(id, dto);
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: 'uuid-of-subscription' })
  async disableSubscription(@Param('id') id: string) {
    return this.subscriptionsService.disableSubscription(id);
  }

  @Post('change')
  @ApiOperation({ summary: 'Change tenant subscription (upgrade/downgrade)' })
  @ApiBody({ type: ChangeSubscriptionDto })
  @ApiResponse({ status: 201, description: 'Subscription changed successfully', type: Subscription })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Tenant or plan not found' })
  async changeSubscription(@Body() dto: ChangeSubscriptionDto): Promise<Subscription> {
    return this.subscriptionsService.changeSubscription(dto.tenantId, dto.planId);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get all subscriptions for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'uuid-of-tenant' })
  @ApiResponse({ status: 200, description: 'List of subscriptions for the tenant', type: [Subscription] })
  async getAllSubscriptionsByTenant(@Param('tenantId') tenantId: string): Promise<Subscription[]> {
    return this.subscriptionsService.getAllSubscriptionsByTenant(tenantId);
  }

  @Get('active/:tenantId')
  @ApiOperation({ summary: 'Get active subscription for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'uuid-of-tenant' })
  @ApiResponse({ status: 200, description: 'Active subscription found', type: Subscription })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async getActiveSubscription(@Param('tenantId') tenantId: string): Promise<Subscription> {
    const subscription = await this.subscriptionsService.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException(`No active subscription found for tenant ${tenantId}`);
    }
    return subscription;
  }
}
