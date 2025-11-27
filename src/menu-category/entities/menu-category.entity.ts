import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { MenuItem } from '../../menu-item/entities/menu-item.entity';
import { Image } from '../../file/entities/image.entity';
import { Expose } from 'class-transformer';

@Entity()
export class MenuCategory {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column()
  name: string;

  @Expose()
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Expose()
  @Column({ default: true })
  isActive: boolean;

  @Expose()
  @OneToOne(() => Image, { nullable: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  image: Image | null;

  @Expose()
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @Expose()
  @ManyToOne(() => User, { nullable: true })
  createdBy: User;

  @Expose()
  @OneToMany(() => MenuItem, (menuItem) => menuItem.category, { cascade: true, onDelete: 'CASCADE' })
  items: MenuItem[];

  @Expose()
  @CreateDateColumn()
  createdAt: Date;

  @Expose()
  @UpdateDateColumn()
  updatedAt: Date;
}

