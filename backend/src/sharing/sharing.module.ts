import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Share } from './share.entity';
import { FileEntity } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';
import { User } from '../users/user.entity';
import { SharingService } from './sharing.service';
import { SharingController } from './sharing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Share, FileEntity, Folder, User])],
  providers: [SharingService],
  controllers: [SharingController],
  exports: [SharingService],
})
export class SharingModule {}
