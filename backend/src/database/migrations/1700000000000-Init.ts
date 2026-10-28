import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await q.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar UNIQUE NOT NULL,
        "passwordHash" varchar NOT NULL,
        "displayName" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE "file_blobs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sha256" varchar NOT NULL,
        "s3Key" varchar NOT NULL,
        "size" bigint NOT NULL,
        "refCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE UNIQUE INDEX "IDX_blob_sha256" ON "file_blobs" ("sha256")`);

    await q.query(`
      CREATE TABLE "folders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "ownerId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "parentId" uuid REFERENCES "folders"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX "IDX_folder_owner" ON "folders" ("ownerId")`);
    await q.query(`CREATE INDEX "IDX_folder_parent" ON "folders" ("parentId")`);
    await q.query(`CREATE INDEX "IDX_folder_name_trgm" ON "folders" USING gin ("name" gin_trgm_ops)`);

    await q.query(`
      CREATE TABLE "files" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "mimeType" varchar,
        "blobId" uuid NOT NULL REFERENCES "file_blobs"("id"),
        "ownerId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "folderId" uuid REFERENCES "folders"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX "IDX_file_owner" ON "files" ("ownerId")`);
    await q.query(`CREATE INDEX "IDX_file_folder" ON "files" ("folderId")`);
    await q.query(`CREATE INDEX "IDX_file_name_trgm" ON "files" USING gin ("name" gin_trgm_ops)`);

    await q.query(`
      CREATE TYPE "permission_level" AS ENUM ('owner','editor','viewer')`);
    await q.query(`
      CREATE TABLE "shares" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "fileId" uuid REFERENCES "files"("id") ON DELETE CASCADE,
        "folderId" uuid REFERENCES "folders"("id") ON DELETE CASCADE,
        "permission" "permission_level" NOT NULL,
        "grantedBy" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_share" UNIQUE ("userId","fileId","folderId")
      )`);
    await q.query(`CREATE INDEX "IDX_share_user" ON "shares" ("userId")`);
    await q.query(`CREATE INDEX "IDX_share_file" ON "shares" ("fileId")`);
    await q.query(`CREATE INDEX "IDX_share_folder" ON "shares" ("folderId")`);

    await q.query(`
      CREATE TABLE "upload_sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ownerId" uuid NOT NULL,
        "fileName" varchar NOT NULL,
        "mimeType" varchar,
        "folderId" uuid,
        "totalSize" bigint NOT NULL,
        "totalChunks" integer NOT NULL,
        "receivedChunks" jsonb NOT NULL DEFAULT '[]',
        "status" varchar NOT NULL DEFAULT 'pending',
        "tempDir" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "upload_sessions"`);
    await q.query(`DROP TABLE "shares"`);
    await q.query(`DROP TYPE "permission_level"`);
    await q.query(`DROP TABLE "files"`);
    await q.query(`DROP TABLE "folders"`);
    await q.query(`DROP TABLE "file_blobs"`);
    await q.query(`DROP TABLE "users"`);
  }
}
