import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export type Gender = 'male' | 'female' | 'other' | 'unknown';
export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'inactive' | 'banned';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  _id!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: false })
  password!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  firstName?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  lastName?: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name?: string | null;

  @Column({ type: 'date', nullable: true })
  birthday?: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'unknown' })
  gender!: Gender;

  @Column({ type: 'text', nullable: true })
  avatar?: string | null;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role!: UserRole;

  @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
  friends!: string[];

  @Column('text', { array: true, default: () => 'ARRAY[]::text[]' })
  requests!: string[];

  @Column({ type: 'integer', default: 0 })
  likeCount!: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: UserStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date; // DB tự default now()

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date; // DB tự update now()

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
