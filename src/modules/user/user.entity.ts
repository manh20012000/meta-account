import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  email!: string;

  // Nếu vẫn giữ tên 'password', hãy chắc chắn service luôn xử lý hash ở đây
  @Column({ type: 'varchar', length: 120 })
  password!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name?: string;

  // đổi type TS cho khớp cột 'date'
  @Column({ type: 'date', nullable: true })
  birthday?: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'unknown' })
  gender!: 'male' | 'female' | 'other' | 'unknown';

  @Column({ type: 'text', nullable: true })
  avatar?: string | null;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role!: 'user' | 'admin' | 'moderator';

  @Column('text', { array: true, default: () => "'{}'" })
  friends!: string[];

  @Column('text', { array: true, default: () => "'{}'" })
  requests!: string[];

  @Column({ type: 'integer', default: 0 })
  likeCount!: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'inactive' | 'banned';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
