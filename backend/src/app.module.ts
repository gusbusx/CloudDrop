import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from './config/configuration';
import { User } from './users/user.entity';
import { FileEntity } from './files/file.entity';
import { FileBlob } from './files/file-blob.entity';
import { Folder } from './folders/folder.entity';
import { Share } from './sharing/share.entity';
import { UploadSession } from './files/upload-session.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { FoldersModule } from './folders/folders.module';
import { SharingModule } from './sharing/sharing.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...config().db,
      entities: [User, FileEntity, FileBlob, Folder, Share, UploadSession],
      synchronize: false,
      autoLoadEntities: true,
    }),
    RedisModule,
    StorageModule,
    AuthModule,
    UsersModule,
    SharingModule,
    FoldersModule,
    FilesModule,
    SearchModule,
  ],
})
export class AppModule {}
