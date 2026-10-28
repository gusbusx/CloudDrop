import api from './client';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

export interface UploadSession {
  id: string;
  totalChunks: number;
  receivedChunks: number[];
  status: string;
}

// Resumable chunked upload. Splits the file, initializes a session, then
// uploads each missing chunk. Can resume by passing an existing sessionId.
export async function chunkedUpload(
  file: File,
  folderId: string | null,
  onProgress: (pct: number) => void,
  existingSessionId?: string,
): Promise<void> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let session: UploadSession;

  if (existingSessionId) {
    const { data } = await api.get(`/files/upload/${existingSessionId}/status`);
    session = data;
  } else {
    const { data } = await api.post('/files/upload/init', {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      folderId: folderId || undefined,
      totalSize: file.size,
      totalChunks,
    });
    session = data;
  }

  const done = new Set(session.receivedChunks || []);
  let uploaded = done.size;

  for (let i = 0; i < totalChunks; i += 1) {
    if (done.has(i)) continue;
    const start = i * CHUNK_SIZE;
    const blob = file.slice(start, start + CHUNK_SIZE);
    const form = new FormData();
    form.append('chunk', blob, `${file.name}.part${i}`);
    await api.post(`/files/upload/${session.id}/chunk/${i}`, form);
    uploaded += 1;
    onProgress(Math.round((uploaded / totalChunks) * 100));
  }

  await api.post(`/files/upload/${session.id}/complete`);
  onProgress(100);
}

export function shouldChunk(file: File): boolean {
  return file.size > CHUNK_SIZE;
}
