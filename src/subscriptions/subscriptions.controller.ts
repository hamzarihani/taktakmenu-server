import { Controller, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiBody } from '@nestjs/swagger';
import { UpdateSubscriptionDto } from './dtos/update-subscription.dto';

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
}
