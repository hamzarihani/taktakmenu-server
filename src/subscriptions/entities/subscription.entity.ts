import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Plan } from 'src/plan/entities/plan.entity';
import { Expose } from 'class-transformer';

@Entity()
export class Subscription {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @OneToOne(() => Tenant, (tenant) => tenant.subscription, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn() // <--- this makes Subscription the owner and stores tenantId FK
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
  @Column({ default: true })
  isActive: boolean;

  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;
}
