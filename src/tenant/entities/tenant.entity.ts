import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Expose } from 'class-transformer';
import { Plan } from 'src/plan/entities/plan.entity';

@Entity()
export class Tenant {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column()
  name: string;
  
  @Expose()
  @Column({ unique: true })
  subdomain: string;
  
  @Expose()
  @Column({ nullable: true })
  logo: string;
  
  @Expose()
  @Column({ nullable: true })
  description: string;
  
  @Expose()
  @Column({ nullable: true })
  address: string;
  
  @Expose()
  @Column({ nullable: true })
  phone: string;
  
  @Expose()
  @Column({ unique: true })
  email: string;
  
  @Expose()
  @Column({ nullable: true })
  openingHours: string;
  
  @Expose()
  @Column({ default: false })
  showInfoToClients: boolean;
  
  @Expose()
  @Column({ nullable: true })
  themeColor: string;
  
  @Expose()
  @OneToMany(() => User, (user) => user.tenant, { cascade: true, onDelete: 'CASCADE' })
  users: User[];

  @ManyToOne(() => Plan, (plan) => plan.tenants, { nullable: true })
  plan: Plan;
  
  @Expose()
  @ManyToOne(() => User, { nullable: true })
  createdBy: User;
  
  @Expose()
  @CreateDateColumn()
  createdAt: Date;
  
  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;
}
