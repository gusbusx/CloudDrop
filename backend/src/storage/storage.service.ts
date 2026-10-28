import { Injectable } from '@nestjs/common';
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { config } from '../config/configuration';

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const c = config().s3;
    this.bucket = c.bucket;
    this.client = new S3Client({
      region: c.region,
      ...(c.endpoint ? { endpoint: c.endpoint, forcePathStyle: c.forcePathStyle } : {}),
      ...(c.accessKeyId
        ? { credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } }
        : {}),
    });
  }

  async putObject(key: string, body: Buffer | Readable, contentType?: string) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: body, ContentType: contentType,
    }));
  }

  async getObjectStream(key: string): Promise<Readable> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }

  async getPresignedDownloadUrl(key: string, fileName: string, expiresIn = 3600) {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
