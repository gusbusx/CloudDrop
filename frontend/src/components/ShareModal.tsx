import { useEffect, useState } from 'react';
import api from '../api/client';
import { Permission, Share } from '../types';
import { DEMO_MODE } from '../demo';

interface Props {
  type: 'file' | 'folder';
  id: string;
  name: string;
  onClose: () => void;
}

export default function ShareModal({ type, id, name, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<Permission>('viewer');
  const [shares, setShares] = useState<Share[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (DEMO_MODE) return;
    const { data } = await api.get(`/share/${type}/${id}`);
    setShares(data);
  };
  useEffect(() => { load(); }, [id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (DEMO_MODE) {
        const share: Share = {
          id: crypto.randomUUID(), userId: email, fileId: type === 'file' ? id : null,
          folderId: type === 'folder' ? id : null, permission,
          user: { id: email, email },
        };
        setShares((current) => [...current, share]);
        setEmail('');
      } else {
        await api.post(`/share/${type}/${id}`, { email, permission });
        setEmail('');
        await load();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not share');
    } finally { setBusy(false); }
  };

  const revoke = async (shareId: string) => {
    if (DEMO_MODE) {
      setShares((current) => current.filter((share) => share.id !== shareId));
      return;
    }
    await api.delete(`/share/${shareId}`);
    await load();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Share “{name}”</h3>
        {DEMO_MODE && <div className="demo-note">Demo mode: sharing changes are simulated in your browser.</div>}
        <form onSubmit={add}>
          <div className="row-select">
            <input className="input" type="email" placeholder="Person's email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            <select className="input" value={permission}
              onChange={(e) => setPermission(e.target.value as Permission)}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button className="btn btn-primary" disabled={busy}>Share</button>
          </div>
        </form>
        {error && <div className="error">{error}</div>}
        <div className="share-list">
          {shares.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Not shared with anyone yet.</div>}
          {shares.map((s) => (
            <div className="share-entry" key={s.id}>
              <span>{s.user?.email || s.userId}</span>
              <div className="row-select">
                <span className="badge">{s.permission}</span>
                <button className="btn btn-danger" onClick={() => revoke(s.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
