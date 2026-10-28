# CloudDrop — Simplified Cloud File Storage

A full-stack Dropbox-style file storage app: React + TypeScript frontend, NestJS backend, PostgreSQL, Redis, and AWS S3 for object storage. Features JWT auth, folders, resumable chunked uploads, SHA-256 content deduplication, sharing with owner/editor/viewer permissions, and fast indexed search.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** NestJS 10 + TypeORM
- **Database:** PostgreSQL 16 (with `pg_trgm` for fast name search)
- **Cache:** Redis 7
- **Object storage:** AWS S3 (or any S3-compatible endpoint such as MinIO/LocalStack)
- **Containers:** Docker + Docker Compose

## Features

- **Auth:** registration, login, JWT, guarded API routes.
- **File management:** upload, download (presigned S3 URLs), delete, rename, move; folders; size & date shown.
- **Resumable chunked uploads:** files > 5 MB are split into chunks, uploaded individually, can resume after interruption, and are reassembled server-side.
- **Deduplication:** every file is hashed with SHA-256. Identical content is stored in S3 only once; metadata rows reference a shared blob via a reference count.
- **Sharing & permissions:** share files or folders by email at `owner`, `editor`, or `viewer` level. Folder permissions are inherited by contained items. Owners manage permissions, editors can modify, viewers can view/download.
- **Search:** name search across files and folders, backed by GIN trigram indexes in PostgreSQL.

## Project Structure

```
dropbox-clone/
├── docker-compose.yml
├── .env.example
├── backend/                  # NestJS API
│   ├── Dockerfile
│   ├── docker-entrypoint.sh  # waits for DB, runs migrations, starts server
│   └── src/
│       ├── auth/             # JWT auth (register, login, strategy, guard)
│       ├── users/
│       ├── files/            # files, blobs (dedup), chunked upload sessions
│       ├── folders/
│       ├── sharing/          # shares + permission resolution/inheritance
│       ├── search/           # trigram-indexed search
│       ├── storage/          # S3 service
│       ├── redis/
│       ├── config/           # configuration + TypeORM data-source
│       └── database/migrations/
└── frontend/                 # React + Vite SPA
    ├── Dockerfile            # builds and serves via nginx (proxies /api)
    ├── nginx.conf
    └── src/
        ├── api/              # axios client + chunked upload helper
        ├── context/          # auth context
        ├── components/       # ShareModal, InputModal, Icons
        ├── pages/            # Login, Register, Dashboard (file explorer)
        ├── types/
        └── utils/
```

## Database Schema

- **users** — `id`, `email` (unique), `passwordHash`, `displayName`, `createdAt`.
- **file_blobs** — physical S3 objects, deduplicated by `sha256` (unique). Columns: `s3Key`, `size`, `refCount`.
- **files** — logical per-user file metadata: `name`, `mimeType`, `blobId` → `file_blobs`, `ownerId`, `folderId`, timestamps. Trigram index on `name`.
- **folders** — `name`, `ownerId`, self-referencing `parentId`. Trigram index on `name`.
- **shares** — grants `(userId, fileId|folderId, permission)` where permission ∈ `owner|editor|viewer`. Unique per target.
- **upload_sessions** — resumable upload state: `fileName`, `totalSize`, `totalChunks`, `receivedChunks[]`, `status`, `tempDir`.

## Quick Start (Docker)

1. Copy env and fill in your AWS S3 credentials (an S3 bucket is required for real storage):

   ```bash
   cp .env.example .env
   # edit .env: set JWT_SECRET, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   ```

2. Build and start everything:

   ```bash
   docker compose up --build
   ```

   The backend waits for Postgres, runs migrations automatically, then starts.

3. Open the app:

   - Frontend: http://localhost:8080
   - API: http://localhost:3000/api

### Optional: local S3 with MinIO

Add a MinIO service to `docker-compose.yml`, then in `.env` set:

```
S3_ENDPOINT=http://minio:9000
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
```

## Local Development (without Docker)

**Backend**

```bash
cd backend
cp .env.example .env        # configure DB / S3
npm install
npm run migration:run       # apply schema
npm run start:dev           # http://localhost:3000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :3000)
```

You need a local PostgreSQL and Redis running, or start just those with:

```bash
docker compose up postgres redis
```

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/files?folderId=` | List files in a folder |
| POST | `/api/files/upload` | Simple multipart upload |
| GET | `/api/files/:id/download-url` | Presigned download URL |
| PATCH | `/api/files/:id/move` | Move file |
| DELETE | `/api/files/:id` | Delete file (decrements blob refcount) |
| POST | `/api/files/upload/init` | Start resumable upload session |
| POST | `/api/files/upload/:id/chunk/:index` | Upload one chunk |
| GET | `/api/files/upload/:id/status` | Get received chunks (for resume) |
| POST | `/api/files/upload/:id/complete` | Reassemble + finalize |
| GET/POST | `/api/folders` | List / create folders |
| POST | `/api/share/file/:id` | Share a file (`email`, `permission`) |
| POST | `/api/share/folder/:id` | Share a folder |
| GET | `/api/share/shared-with-me` | Items shared with the current user |
| GET | `/api/search?q=` | Search files & folders by name |

All routes except `/auth/*` require `Authorization: Bearer <token>`.

## Notes

- File chunk size is 5 MB (configurable in `frontend/src/api/upload.ts`).
- Deduplication is content-based: uploading the same bytes (even by different users) stores one S3 object; deletion only removes the object when the last reference is gone.
- Passwords are hashed with bcrypt. Set a strong `JWT_SECRET` in production.

## Live Frontend Demo

This repository includes a GitHub Pages workflow for a frontend-only portfolio demo. The deployed demo runs with sample browser-local data so visitors can explore CloudDrop without requiring the backend infrastructure to be online.

The full application architecture remains in this repository and uses NestJS, PostgreSQL, Redis, S3-compatible object storage, and Docker Compose. The frontend demo is intentionally separated from the production API path and is enabled only at build time with `VITE_DEMO_MODE=true`.
