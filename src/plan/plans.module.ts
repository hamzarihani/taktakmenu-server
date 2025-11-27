import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription])],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
