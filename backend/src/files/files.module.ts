import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './file.entity';
import { FileBlob } from './file-blob.entity';
import { UploadSession } from './upload-session.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { SharingModule } from '../sharing/sharing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity, FileBlob, UploadSession]),
    SharingModule,
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
