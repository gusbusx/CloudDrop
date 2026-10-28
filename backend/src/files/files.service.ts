import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileEntity } from './file.entity';
import { FileBlob } from './file-blob.entity';
import { UploadSession } from './upload-session.entity';
import { StorageService } from '../storage/storage.service';
import { SharingService } from '../sharing/sharing.service';
import { PermissionLevel } from '../sharing/permission.enum';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(FileBlob) private readonly blobs: Repository<FileBlob>,
    @InjectRepository(UploadSession) private readonly sessions: Repository<UploadSession>,
    private readonly storage: StorageService,
    private readonly sharing: SharingService,
    private readonly dataSource: DataSource,
  ) {}

  private sha256(buf: Buffer) {
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  // Deduplicating blob resolution. If a blob with the hash exists, reuse it
  // and bump refCount; otherwise upload to S3 and create the blob row.
  private async resolveBlob(buffer: Buffer, mimeType?: string): Promise<FileBlob> {
    const hash = this.sha256(buffer);
    return this.dataSource.transaction(async (mgr) => {
      let blob = await mgr.findOne(FileBlob, { where: { sha256: hash } });
      if (blob) {
        blob.refCount += 1;
        return mgr.save(blob);
      }
      const s3Key = `blobs/${hash}`;
      const present = await this.storage.exists(s3Key);
      if (!present) {
        await this.storage.putObject(s3Key, buffer, mimeType);
      }
      blob = mgr.create(FileBlob, {
        sha256: hash, s3Key, size: String(buffer.length), refCount: 1,
      });
      return mgr.save(blob);
    });
  }

  async uploadSimple(
    ownerId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string },
    folderId?: string,
  ) {
    if (folderId) {
      await this.sharing.assertFolderPermission(ownerId, folderId, PermissionLevel.EDITOR);
    }
    const blob = await this.resolveBlob(file.buffer, file.mimetype);
    const entity = this.files.create({
      name: file.originalname,
      mimeType: file.mimetype,
      blobId: blob.id,
      ownerId,
      folderId: folderId || null,
    });
    return this.files.save(entity);
  }

  async list(ownerId: string, folderId?: string) {
    return this.files.find({
      where: { ownerId, folderId: folderId ? folderId : IsNull() },
      order: { name: 'ASC' },
    });
  }

  async getMeta(userId: string, id: string) {
    await this.sharing.assertFilePermission(userId, id, PermissionLevel.VIEWER);
    const file = await this.files.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async getDownloadUrl(userId: string, id: string) {
    const file = await this.getMeta(userId, id);
    const url = await this.storage.getPresignedDownloadUrl(file.blob.s3Key, file.name);
    return { url };
  }

  async getStream(userId: string, id: string) {
    const file = await this.getMeta(userId, id);
    const stream = await this.storage.getObjectStream(file.blob.s3Key);
    return { stream, file };
  }

  async rename(userId: string, id: string, name: string) {
    await this.sharing.assertFilePermission(userId, id, PermissionLevel.EDITOR);
    await this.files.update(id, { name });
    return this.files.findOne({ where: { id } });
  }

  async move(userId: string, id: string, folderId: string | null) {
    await this.sharing.assertFilePermission(userId, id, PermissionLevel.EDITOR);
    if (folderId) {
      await this.sharing.assertFolderPermission(userId, folderId, PermissionLevel.EDITOR);
    }
    await this.files.update(id, { folderId });
    return this.files.findOne({ where: { id } });
  }

  async remove(userId: string, id: string) {
    await this.sharing.assertFilePermission(userId, id, PermissionLevel.OWNER);
    const file = await this.files.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    await this.dataSource.transaction(async (mgr) => {
      await mgr.delete(FileEntity, id);
      const blob = await mgr.findOne(FileBlob, { where: { id: file.blobId } });
      if (blob) {
        blob.refCount -= 1;
        if (blob.refCount <= 0) {
          await this.storage.deleteObject(blob.s3Key);
          await mgr.delete(FileBlob, blob.id);
        } else {
          await mgr.save(blob);
        }
      }
    });
    return { success: true };
  }

  // ---------- Resumable chunked uploads ----------

  async initUpload(ownerId: string, dto: {
    fileName: string; mimeType?: string; folderId?: string;
    totalSize: number; totalChunks: number;
  }) {
    if (dto.folderId) {
      await this.sharing.assertFolderPermission(ownerId, dto.folderId, PermissionLevel.EDITOR);
    }
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
    const session = this.sessions.create({
      ownerId,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      folderId: dto.folderId || null,
      totalSize: String(dto.totalSize),
      totalChunks: dto.totalChunks,
      receivedChunks: [],
      status: 'pending',
      tempDir,
    });
    return this.sessions.save(session);
  }

  async getSession(ownerId: string, id: string) {
    const s = await this.sessions.findOne({ where: { id } });
    if (!s || s.ownerId !== ownerId) throw new NotFoundException('Session not found');
    return s;
  }

  // Stores one chunk on local temp disk and records its index, enabling resume.
  async uploadChunk(ownerId: string, id: string, index: number, buffer: Buffer) {
    const session = await this.getSession(ownerId, id);
    if (session.status !== 'pending') throw new BadRequestException('Session not active');
    if (index < 0 || index >= session.totalChunks) {
      throw new BadRequestException('Chunk index out of range');
    }
    fs.writeFileSync(path.join(session.tempDir, `${index}.part`), buffer);
    if (!session.receivedChunks.includes(index)) {
      session.receivedChunks = [...session.receivedChunks, index].sort((a, b) => a - b);
      await this.sessions.save(session);
    }
    return {
      received: session.receivedChunks,
      remaining: session.totalChunks - session.receivedChunks.length,
    };
  }

  // Reassembles all chunks, hashes the result for dedup, and creates the file.
  async completeUpload(ownerId: string, id: string) {
    const session = await this.getSession(ownerId, id);
    if (session.receivedChunks.length !== session.totalChunks) {
      throw new BadRequestException('Missing chunks; upload incomplete');
    }
    const buffers: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i += 1) {
      const p = path.join(session.tempDir, `${i}.part`);
      if (!fs.existsSync(p)) throw new BadRequestException(`Missing chunk ${i}`);
      buffers.push(fs.readFileSync(p));
    }
    const full = Buffer.concat(buffers);
    const blob = await this.resolveBlob(full, session.mimeType);
    const entity = this.files.create({
      name: session.fileName,
      mimeType: session.mimeType,
      blobId: blob.id,
      ownerId,
      folderId: session.folderId || null,
    });
    const saved = await this.files.save(entity);

    session.status = 'completed';
    await this.sessions.save(session);
    fs.rmSync(session.tempDir, { recursive: true, force: true });
    return saved;
  }

  async abortUpload(ownerId: string, id: string) {
    const session = await this.getSession(ownerId, id);
    session.status = 'aborted';
    await this.sessions.save(session);
    if (session.tempDir && fs.existsSync(session.tempDir)) {
      fs.rmSync(session.tempDir, { recursive: true, force: true });
    }
    return { success: true };
  }
}
