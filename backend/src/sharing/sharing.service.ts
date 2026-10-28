import {
  Injectable, ForbiddenException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Share } from './share.entity';
import { PermissionLevel } from './permission.enum';
import { FileEntity } from '../files/file.entity';
import { Folder } from '../folders/folder.entity';
import { User } from '../users/user.entity';

const RANK = {
  [PermissionLevel.VIEWER]: 1,
  [PermissionLevel.EDITOR]: 2,
  [PermissionLevel.OWNER]: 3,
};

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(Share) private readonly shares: Repository<Share>,
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(Folder) private readonly folders: Repository<Folder>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // Returns the effective permission a user has on a file (direct owner,
  // explicit share, or inherited from a shared ancestor folder).
  async getFilePermission(userId: string, fileId: string): Promise<PermissionLevel | null> {
    const file = await this.files.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    if (file.ownerId === userId) return PermissionLevel.OWNER;

    const share = await this.shares.findOne({ where: { userId, fileId } });
    if (share) return share.permission;

    if (file.folderId) {
      const inherited = await this.getFolderPermission(userId, file.folderId);
      if (inherited) return inherited;
    }
    return null;
  }

  async getFolderPermission(userId: string, folderId: string): Promise<PermissionLevel | null> {
    let current = await this.folders.findOne({ where: { id: folderId } });
    while (current) {
      if (current.ownerId === userId) return PermissionLevel.OWNER;
      const share = await this.shares.findOne({ where: { userId, folderId: current.id } });
      if (share) return share.permission;
      if (!current.parentId) break;
      current = await this.folders.findOne({ where: { id: current.parentId } });
    }
    return null;
  }

  private atLeast(p: PermissionLevel | null, required: PermissionLevel) {
    return p != null && RANK[p] >= RANK[required];
  }

  async assertFilePermission(userId: string, fileId: string, required: PermissionLevel) {
    const p = await this.getFilePermission(userId, fileId);
    if (!this.atLeast(p, required)) throw new ForbiddenException('Insufficient permission');
    return p;
  }

  async assertFolderPermission(userId: string, folderId: string, required: PermissionLevel) {
    const p = await this.getFolderPermission(userId, folderId);
    if (!this.atLeast(p, required)) throw new ForbiddenException('Insufficient permission');
    return p;
  }

  async shareFile(ownerId: string, fileId: string, targetEmail: string, permission: PermissionLevel) {
    await this.assertFilePermission(ownerId, fileId, PermissionLevel.OWNER);
    const target = await this.users.findOne({ where: { email: targetEmail } });
    if (!target) throw new NotFoundException('Target user not found');
    if (target.id === ownerId) throw new BadRequestException('Cannot share with yourself');
    return this.upsertShare(ownerId, target.id, { fileId, folderId: null }, permission);
  }

  async shareFolder(ownerId: string, folderId: string, targetEmail: string, permission: PermissionLevel) {
    await this.assertFolderPermission(ownerId, folderId, PermissionLevel.OWNER);
    const target = await this.users.findOne({ where: { email: targetEmail } });
    if (!target) throw new NotFoundException('Target user not found');
    if (target.id === ownerId) throw new BadRequestException('Cannot share with yourself');
    return this.upsertShare(ownerId, target.id, { fileId: null, folderId }, permission);
  }

  private async upsertShare(
    grantedBy: string, userId: string,
    target: { fileId: string | null; folderId: string | null },
    permission: PermissionLevel,
  ) {
    let share = await this.shares.findOne({
      where: { userId, fileId: target.fileId, folderId: target.folderId },
    });
    if (share) {
      share.permission = permission;
    } else {
      share = this.shares.create({ userId, ...target, permission, grantedBy });
    }
    return this.shares.save(share);
  }

  async revoke(ownerId: string, shareId: string) {
    const share = await this.shares.findOne({ where: { id: shareId } });
    if (!share) throw new NotFoundException('Share not found');
    if (share.fileId) await this.assertFilePermission(ownerId, share.fileId, PermissionLevel.OWNER);
    else if (share.folderId) await this.assertFolderPermission(ownerId, share.folderId, PermissionLevel.OWNER);
    await this.shares.remove(share);
    return { success: true };
  }

  listFileShares(fileId: string) {
    return this.shares.find({ where: { fileId }, relations: ['user'] });
  }

  listFolderShares(folderId: string) {
    return this.shares.find({ where: { folderId }, relations: ['user'] });
  }

  // Items shared *with* the given user.
  async listSharedWithMe(userId: string) {
    const shares = await this.shares.find({ where: { userId } });
    const fileIds = shares.filter((s) => s.fileId).map((s) => s.fileId);
    const folderIds = shares.filter((s) => s.folderId).map((s) => s.folderId);
    const files = fileIds.length
      ? await this.files.findByIds(fileIds) : [];
    const folders = folderIds.length
      ? await this.folders.findByIds(folderIds) : [];
    return { files, folders, shares };
  }
}
