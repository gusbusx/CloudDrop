import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Folder } from '../folders/folder.entity';
import { FileBlob } from './file-blob.entity';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column({ nullable: true })
  mimeType: string;

  @ManyToOne(() => FileBlob, { eager: true })
  @JoinColumn({ name: 'blobId' })
  blob: FileBlob;

  @Column()
  blobId: string;

  @ManyToOne(() => User, (u) => u.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Index()
  @Column()
  ownerId: string;

  @ManyToOne(() => Folder, (f) => f.files, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @Index()
  @Column({ nullable: true })
  folderId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
