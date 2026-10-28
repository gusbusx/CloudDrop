import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from './folder.entity';
import { SharingService } from '../sharing/sharing.service';
import { PermissionLevel } from '../sharing/permission.enum';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder) private readonly repo: Repository<Folder>,
    private readonly sharing: SharingService,
  ) {}

  async create(ownerId: string, name: string, parentId?: string) {
    if (parentId) {
      await this.sharing.assertFolderPermission(ownerId, parentId, PermissionLevel.EDITOR);
    }
    const folder = this.repo.create({ name, ownerId, parentId: parentId || null });
    return this.repo.save(folder);
  }

  async list(ownerId: string, parentId?: string) {
    return this.repo.find({
      where: { ownerId, parentId: parentId ? parentId : IsNull() },
      order: { name: 'ASC' },
    });
  }

  async get(userId: string, id: string) {
    await this.sharing.assertFolderPermission(userId, id, PermissionLevel.VIEWER);
    const folder = await this.repo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async rename(userId: string, id: string, name: string) {
    await this.sharing.assertFolderPermission(userId, id, PermissionLevel.EDITOR);
    await this.repo.update(id, { name });
    return this.repo.findOne({ where: { id } });
  }

  async move(userId: string, id: string, newParentId: string | null) {
    await this.sharing.assertFolderPermission(userId, id, PermissionLevel.EDITOR);
    if (newParentId) {
      await this.sharing.assertFolderPermission(userId, newParentId, PermissionLevel.EDITOR);
    }
    await this.repo.update(id, { parentId: newParentId });
    return this.repo.findOne({ where: { id } });
  }

  async remove(userId: string, id: string) {
    await this.sharing.assertFolderPermission(userId, id, PermissionLevel.OWNER);
    await this.repo.delete(id); // cascades to children & files
    return { success: true };
  }
}
