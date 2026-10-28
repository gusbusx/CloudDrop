import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { FileEntity } from '../files/file.entity';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @ManyToOne(() => User, (u) => u.folders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Index()
  @Column()
  ownerId: string;

  @ManyToOne(() => Folder, (f) => f.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: Folder;

  @Index()
  @Column({ nullable: true })
  parentId: string;

  @OneToMany(() => Folder, (f) => f.parent)
  children: Folder[];

  @OneToMany(() => FileEntity, (f) => f.folder)
  files: FileEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
