import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { FileEntity } from '../files/file.entity';
import { FileBlob } from '../files/file-blob.entity';
import { Folder } from '../folders/folder.entity';
import { Share } from '../sharing/share.entity';
import { UploadSession } from '../files/upload-session.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'dropbox',
  entities: [User, FileEntity, FileBlob, Folder, Share, UploadSession],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
