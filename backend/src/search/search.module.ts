import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity, Folder])],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
