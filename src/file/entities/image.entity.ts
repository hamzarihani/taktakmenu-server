import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Expose } from 'class-transformer';

@Entity()
export class Image {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Expose()
  @Column({ type: 'longblob' })
  data: Buffer;

  @Expose()
  @Column({ type: 'varchar', nullable: true })
  originalName: string | null;

  @Expose()
  @Column({ type: 'varchar', nullable: true })
  mimeType: string | null;

  @Expose()
  @Column({ type: 'int', nullable: true })
  size: number | null;

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

