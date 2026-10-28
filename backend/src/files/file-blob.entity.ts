import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

// A FileBlob represents the actual physical bytes stored in S3.
// Deduplication: one blob per unique SHA-256 hash. Many FileEntity rows
// (owned by different users) can reference the same blob.
@Entity('file_blobs')
export class FileBlob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  sha256: string;

  @Column()
  s3Key: string;

  @Column({ type: 'bigint' })
  size: string;

  @Column({ default: 0 })
  refCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
