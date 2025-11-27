import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { MenuCategory } from '../../menu-category/entities/menu-category.entity';
import { Image } from '../../file/entities/image.entity';
import { Expose } from 'class-transformer';

@Entity()
export class MenuItem {
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
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Expose()
  @Column({ default: true })
  isActive: boolean;

  @Expose()
  @OneToOne(() => Image, { nullable: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  image: Image | null;

  @Expose()
  @ManyToOne(() => MenuCategory, (category) => category.items, { nullable: false, onDelete: 'CASCADE' })
  category: MenuCategory;

  @Column()
  categoryId: string;

  @Expose()
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column()
  tenantId: string;

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

