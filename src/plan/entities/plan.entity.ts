import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Expose } from 'class-transformer';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';

@Entity()
export class Plan {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ unique: true })
  name: string;

  @Expose()
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Expose()
  @Column({ default: 'USD' })
  currency: string;

  @Expose()
  @Column({ default: 'month' })
  billingPeriod: string;

  @Expose()
  @Column('simple-array')
  features: string[];

  @Expose()
  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  tenants: Subscription[];

  @Expose()
  @CreateDateColumn()
  createdAt: Date;
    
  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;
}
