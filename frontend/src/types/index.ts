export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface FileBlob {
  id: string;
  sha256: string;
  size: string;
  s3Key: string;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType?: string;
  blob?: FileBlob;
  blobId: string;
  ownerId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  createdAt: string;
}

export type Permission = 'owner' | 'editor' | 'viewer';

export interface Share {
  id: string;
  userId: string;
  fileId: string | null;
  folderId: string | null;
  permission: Permission;
  user?: User;
}
