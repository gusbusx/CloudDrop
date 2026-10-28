import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { PermissionLevel } from './permission.enum';

// A Share grants a user a permission level on either a file or a folder.
@Entity('shares')
@Unique(['userId', 'fileId', 'folderId'])
export class Share {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column({ nullable: true })
  fileId: string;

  @Index()
  @Column({ nullable: true })
  folderId: string;

  @Column({ type: 'enum', enum: PermissionLevel })
  permission: PermissionLevel;

  @Column()
  grantedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
