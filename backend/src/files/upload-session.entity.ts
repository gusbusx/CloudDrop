import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('upload_sessions')
export class UploadSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column()
  fileName: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ nullable: true })
  folderId: string;

  @Column({ type: 'bigint' })
  totalSize: string;

  @Column()
  totalChunks: number;

  // JSON array of received chunk indexes
  @Column({ type: 'jsonb', default: [] })
  receivedChunks: number[];

  @Column({ default: 'pending' })
  status: string; // pending | completed | aborted

  @Column({ nullable: true })
  tempDir: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
