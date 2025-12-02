import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Plan } from '../../plan/entities/plan.entity';
import { Expose } from 'class-transformer';

@Entity()
export class Subscription {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @Expose()
  @ManyToOne(() => Plan, { nullable: false })
  plan: Plan;

  @Expose()
  @Column()
  startDate: Date;

  @Expose()
  @Column()
  endDate: Date;

  @Expose()
  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'canceled', 'pending', 'trialing', 'unpaid'],
    default: 'active'
  })
  status: string;

  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;
}
