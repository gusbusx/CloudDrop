import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FileItem, FolderItem } from '../types';
import { formatBytes, formatDate } from '../utils/format';
import { chunkedUpload, shouldChunk } from '../api/upload';
import ShareModal from '../components/ShareModal';
import InputModal from '../components/InputModal';
import {
  DEMO_MODE, demoSharedFiles, demoSharedFolders, initialDemoFiles, initialDemoFolders,
} from '../demo';
import {
  FolderIcon, FileIcon, SearchIcon, DownloadIcon, ShareIcon, TrashIcon,
  MoveIcon, HomeIcon, SharedIcon,
} from '../components/Icons';

interface Crumb { id: string | null; name: string; }
interface UploadProgress { id: string; name: string; pct: number; error?: string; }

type View = 'files' | 'shared';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('files');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: 'My Files' }]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoFolders, setDemoFolders] = useState<FolderItem[]>(initialDemoFolders);
  const [demoFiles, setDemoFiles] = useState<FileItem[]>(initialDemoFiles);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [shareTarget, setShareTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadFolder = useCallback(async () => {
    setLoading(true);
    try {
      if (DEMO_MODE) {
        setFiles(demoFiles.filter((file) => file.folderId === folderId));
        setFolders(demoFolders.filter((folder) => folder.parentId === folderId));
        return;
      }
      const [f, d] = await Promise.all([
        api.get('/files', { params: { folderId: folderId || undefined } }),
        api.get('/folders', { params: { parentId: folderId || undefined } }),
      ]);
      setFiles(f.data);
      setFolders(d.data);
    } finally { setLoading(false); }
  }, [folderId, demoFiles, demoFolders]);

  const loadShared = useCallback(async () => {
    setLoading(true);
    try {
      if (DEMO_MODE) {
        setFiles(demoSharedFiles);
        setFolders(demoSharedFolders);
        return;
      }
      const { data } = await api.get('/share/shared-with-me');
      setFiles(data.files);
      setFolders(data.folders);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (query.trim()) return;
    if (view === 'files') loadFolder();
    else loadShared();
  }, [view, folderId, loadFolder, loadShared, query]);

  useEffect(() => {
    if (!query.trim()) { setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      if (DEMO_MODE) {
        const q = query.trim().toLowerCase();
        setFiles(demoFiles.filter((file) => file.name.toLowerCase().includes(q)));
        setFolders(demoFolders.filter((folder) => folder.name.toLowerCase().includes(q)));
        setLoading(false);
        return;
      }
      const { data } = await api.get('/search', { params: { q: query.trim() } });
      setFiles(data.files);
      setFolders(data.folders);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, demoFiles, demoFolders]);

  const enterFolder = (f: FolderItem) => {
    if (searching) setQuery('');
    if (view === 'shared') setView('files');
    setFolderId(f.id);
    setCrumbs((c) => [...c, { id: f.id, name: f.name }]);
  };

  const goCrumb = (idx: number) => {
    const target = crumbs[idx];
    setCrumbs(crumbs.slice(0, idx + 1));
    setFolderId(target.id);
  };

  const handleFiles = async (list: FileList) => {
    for (const file of Array.from(list)) {
      const upId = crypto.randomUUID();
      setUploads((u) => [...u, { id: upId, name: file.name, pct: 0 }]);
      const onProgress = (pct: number) =>
        setUploads((u) => u.map((x) => (x.id === upId ? { ...x, pct } : x)));
      try {
        if (DEMO_MODE) {
          onProgress(35);
          await new Promise((resolve) => setTimeout(resolve, 250));
          onProgress(75);
          await new Promise((resolve) => setTimeout(resolve, 250));
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          setDemoFiles((current) => [...current, {
            id,
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            blob: { id: `blob-${id}`, sha256: `demo-${id}`, size: String(file.size), s3Key: `demo/${id}` },
            blobId: `blob-${id}`,
            ownerId: user?.id || 'demo-user',
            folderId,
            createdAt: now,
            updatedAt: now,
          }]);
          onProgress(100);
        } else if (shouldChunk(file)) {
          await chunkedUpload(file, folderId, onProgress);
        } else {
          const form = new FormData();
          form.append('file', file);
          if (folderId) form.append('folderId', folderId);
          await api.post('/files/upload', form, {
            onUploadProgress: (e) => {
              if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            },
          });
        }
        setTimeout(() => setUploads((u) => u.filter((x) => x.id !== upId)), 1500);
      } catch (err: any) {
        setUploads((u) => u.map((x) => (x.id === upId
          ? { ...x, error: err.response?.data?.message || 'Upload failed' } : x)));
      }
    }
    if (!DEMO_MODE) loadFolder();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const createFolder = async (name: string) => {
    if (DEMO_MODE) {
      setDemoFolders((current) => [...current, {
        id: crypto.randomUUID(), name, ownerId: user?.id || 'demo-user', parentId: folderId,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      await api.post('/folders', { name, parentId: folderId || undefined });
    }
    setNewFolder(false);
    if (!DEMO_MODE) loadFolder();
  };

  const download = async (f: FileItem) => {
    if (DEMO_MODE) {
      const content = `CloudDrop frontend demo\n\nThis simulated download represents: ${f.name}\n\nThe full project uses NestJS, PostgreSQL, Redis and S3-compatible object storage.`;
      const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${f.name}.demo.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const { data } = await api.get(`/files/${f.id}/download-url`);
    window.open(data.url, '_blank');
  };

  const deleteFile = async (f: FileItem) => {
    if (!confirm(`Delete “${f.name}”?`)) return;
    if (DEMO_MODE) setDemoFiles((current) => current.filter((file) => file.id !== f.id));
    else await api.delete(`/files/${f.id}`);
    reload();
  };

  const deleteFolder = async (f: FolderItem) => {
    if (!confirm(`Delete folder “${f.name}” and its contents?`)) return;
    if (DEMO_MODE) {
      setDemoFolders((current) => current.filter((folder) => folder.id !== f.id && folder.parentId !== f.id));
      setDemoFiles((current) => current.filter((file) => file.folderId !== f.id));
    } else await api.delete(`/folders/${f.id}`);
    reload();
  };

  const moveFile = async (f: FileItem) => {
    if (DEMO_MODE) {
      const destination = prompt('Move to folder name (leave blank for My Files):', '');
      if (destination === null) return;
      const targetName = destination.trim().toLowerCase();
      const target = targetName ? demoFolders.find((folder) => folder.name.toLowerCase() === targetName) : null;
      if (targetName && !target) {
        alert('Demo folder not found. Try “Projects” or “Designs”.');
        return;
      }
      setDemoFiles((current) => current.map((file) => file.id === f.id
        ? { ...file, folderId: target?.id || null, updatedAt: new Date().toISOString() }
        : file));
      return;
    }
    const dest = prompt('Move to folder ID (leave blank for root):', '');
    if (dest === null) return;
    await api.patch(`/files/${f.id}/move`, { folderId: dest.trim() || null });
    reload();
  };

  const reload = () => {
    if (query.trim()) setQuery('');
    else if (view === 'files') loadFolder();
    else loadShared();
  };

  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand" style={{ marginBottom: 24 }}>
          <span className="brand-mark" /> CloudDrop
        </div>
        <button className={`nav-item ${view === 'files' && !query ? 'active' : ''}`}
          onClick={() => { setView('files'); setFolderId(null); setCrumbs([{ id: null, name: 'My Files' }]); setQuery(''); }}>
          <HomeIcon /> My Files
        </button>
        <button className={`nav-item ${view === 'shared' ? 'active' : ''}`}
          onClick={() => { setView('shared'); setQuery(''); }}>
          <SharedIcon /> Shared with me
        </button>
        <div className="sidebar-foot">
          <div className="user-chip">{user?.displayName || user?.email}</div>
          {!DEMO_MODE && <button className="btn" style={{ width: '100%' }} onClick={logout}>Sign out</button>}
        </div>
      </aside>

      <main className="main" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        {DEMO_MODE && (
          <div className="demo-banner">
            <strong>Frontend demo</strong>
            <span>Sample data is local. The full repo includes the Dockerized NestJS + PostgreSQL + Redis + S3 backend.</span>
          </div>
        )}
        <div className="topbar">
          <div className="search">
            <SearchIcon />
            <input className="input" placeholder="Search files and folders"
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <input ref={fileInput} type="file" multiple hidden
            onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          {view === 'files' && !query && (
            <div className="toolbar">
              <button className="btn" onClick={() => setNewFolder(true)}>New folder</button>
              <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>Upload</button>
            </div>
          )}
        </div>

        <div className="content">
          {query ? (
            <div className="section-head"><h2>Search results for “{query}”</h2></div>
          ) : view === 'files' ? (
            <div className="crumbs">
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <span className="sep">/</span>}
                  <button onClick={() => goCrumb(i)}>{c.name}</button>
                </span>
              ))}
            </div>
          ) : (
            <div className="section-head"><h2>Shared with me</h2></div>
          )}

          {loading ? (
            <div className="spinner">Loading…</div>
          ) : isEmpty ? (
            <div className="empty">
              <FileIcon size={48} />
              <p>{query ? 'No matches found.' : 'This folder is empty. Upload or drop files here.'}</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: 120 }}>Size</th>
                  <th style={{ width: 140 }}>Modified</th>
                  <th style={{ width: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {folders.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div className="row-item clickable" onClick={() => enterFolder(f)}>
                        <FolderIcon /><span className="name">{f.name}</span>
                      </div>
                    </td>
                    <td>—</td>
                    <td>{formatDate(f.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Share"
                          onClick={() => setShareTarget({ type: 'folder', id: f.id, name: f.name })}><ShareIcon /></button>
                        {view === 'files' && <button className="icon-btn danger" title="Delete"
                          onClick={() => deleteFolder(f)}><TrashIcon /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {files.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div className="row-item">
                        <FileIcon /><span className="name">{f.name}</span>
                      </div>
                    </td>
                    <td>{f.blob ? formatBytes(f.blob.size) : '—'}</td>
                    <td>{formatDate(f.updatedAt || f.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Download" onClick={() => download(f)}><DownloadIcon /></button>
                        {view === 'files' && <button className="icon-btn" title="Move" onClick={() => moveFile(f)}><MoveIcon /></button>}
                        <button className="icon-btn" title="Share"
                          onClick={() => setShareTarget({ type: 'file', id: f.id, name: f.name })}><ShareIcon /></button>
                        {view === 'files' && <button className="icon-btn danger" title="Delete" onClick={() => deleteFile(f)}><TrashIcon /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {uploads.length > 0 && (
        <div className="uploads">
          <div className="uploads-head">Uploads</div>
          {uploads.map((u) => (
            <div className="upload-row" key={u.id}>
              <div className="upload-name">
                <span>{u.name}</span><span>{u.error ? '' : `${u.pct}%`}</span>
              </div>
              {u.error ? <div className="upload-err">{u.error}</div> : (
                <div className="progress"><div className="progress-bar" style={{ width: `${u.pct}%` }} /></div>
              )}
            </div>
          ))}
        </div>
      )}

      {shareTarget && (
        <ShareModal {...shareTarget} onClose={() => setShareTarget(null)} />
      )}
      {newFolder && (
        <InputModal title="New folder" placeholder="Folder name" confirmLabel="Create"
          onConfirm={createFolder} onClose={() => setNewFolder(false)} />
      )}
    </div>
  );
}
