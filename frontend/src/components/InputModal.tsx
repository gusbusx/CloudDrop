import { useState } from 'react';

interface Props {
  title: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export default function InputModal({
  title, placeholder, initial = '', confirmLabel = 'Save', onConfirm, onClose,
}: Props) {
  const [value, setValue] = useState(initial);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <input className="input" autoFocus value={value} placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onConfirm(value.trim()); }} />
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!value.trim()}
            onClick={() => onConfirm(value.trim())}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
