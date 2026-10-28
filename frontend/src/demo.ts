import { FileItem, FolderItem, User } from './types';

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const demoUser: User = {
  id: 'demo-user',
  email: 'demo@clouddrop.dev',
  displayName: 'Demo User',
};

const now = new Date();
const isoDaysAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

export const initialDemoFolders: FolderItem[] = [
  { id: 'folder-projects', name: 'Projects', ownerId: demoUser.id, parentId: null, createdAt: isoDaysAgo(12) },
  { id: 'folder-designs', name: 'Designs', ownerId: demoUser.id, parentId: null, createdAt: isoDaysAgo(7) },
  { id: 'folder-archive', name: 'Archive', ownerId: demoUser.id, parentId: 'folder-projects', createdAt: isoDaysAgo(4) },
];

const blob = (id: string, size: number) => ({
  id: `blob-${id}`,
  sha256: `demo-${id}`,
  size: String(size),
  s3Key: `demo/${id}`,
});

export const initialDemoFiles: FileItem[] = [
  {
    id: 'file-readme', name: 'CloudDrop Architecture.pdf', mimeType: 'application/pdf',
    blob: blob('readme', 2_430_000), blobId: 'blob-readme', ownerId: demoUser.id,
    folderId: null, createdAt: isoDaysAgo(2), updatedAt: isoDaysAgo(1),
  },
  {
    id: 'file-demo', name: 'demo-recording.mp4', mimeType: 'video/mp4',
    blob: blob('demo', 18_800_000), blobId: 'blob-demo', ownerId: demoUser.id,
    folderId: null, createdAt: isoDaysAgo(5), updatedAt: isoDaysAgo(3),
  },
  {
    id: 'file-api', name: 'api-notes.md', mimeType: 'text/markdown',
    blob: blob('api', 14_800), blobId: 'blob-api', ownerId: demoUser.id,
    folderId: 'folder-projects', createdAt: isoDaysAgo(8), updatedAt: isoDaysAgo(4),
  },
  {
    id: 'file-wireframes', name: 'wireframes.fig', mimeType: 'application/octet-stream',
    blob: blob('wireframes', 6_240_000), blobId: 'blob-wireframes', ownerId: demoUser.id,
    folderId: 'folder-designs', createdAt: isoDaysAgo(6), updatedAt: isoDaysAgo(2),
  },
];

export const demoSharedFolders: FolderItem[] = [
  { id: 'shared-folder', name: 'Team Assets', ownerId: 'other-user', parentId: null, createdAt: isoDaysAgo(9) },
];

export const demoSharedFiles: FileItem[] = [
  {
    id: 'shared-file', name: 'launch-checklist.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    blob: blob('shared', 86_000), blobId: 'blob-shared', ownerId: 'other-user',
    folderId: null, createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(1),
  },
];
