import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(Folder) private readonly folders: Repository<Folder>,
  ) {}

  // Searches owned files & folders by name. Uses trigram-indexed ILIKE
  // (index defined in migration) for fast partial matching.
  async search(userId: string, q: string) {
    const term = `%${q}%`;
    const files = await this.files
      .createQueryBuilder('f')
      .where('f.ownerId = :userId', { userId })
      .andWhere('f.name ILIKE :term', { term })
      .orderBy('f.name', 'ASC')
      .limit(50)
      .getMany();

    const folders = await this.folders
      .createQueryBuilder('d')
      .where('d.ownerId = :userId', { userId })
      .andWhere('d.name ILIKE :term', { term })
      .orderBy('d.name', 'ASC')
      .limit(50)
      .getMany();

    return { files, folders };
  }
}
