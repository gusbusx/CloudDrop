import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { FileEntity } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  displayName: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => FileEntity, (f) => f.owner)
  files: FileEntity[];

  @OneToMany(() => Folder, (f) => f.owner)
  folders: Folder[];
}
