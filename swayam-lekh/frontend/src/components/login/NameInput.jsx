import React from 'react';
import { CheckCircle2, Mic } from 'lucide-react';

export default function NameInput({ label, value, onChange, placeholder, onDone }) {
  const isValid = value && value.length > 2;

  const inputStyle = {
    width: '100%', padding: '12px 48px 12px 12px', fontSize: '16px',
    borderRadius: 'var(--radius-sm)',
    border: `2px solid ${isValid ? 'var(--green)' : 'var(--border)'}`,
    outline: 'none', backgroundColor: isValid ? 'var(--green-light)' : 'var(--surface)',
    height: 'auto',
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '8px', fontWeight: 500, fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isValid && <CheckCircle2 size={20} color="var(--green)" />}
        </div>
      </div>

      {onDone && (
        <button
          onClick={() => isValid && onDone(value)}
          disabled={!isValid}
          style={{
            marginTop: '16px', width: '100%', padding: '10px', background: isValid ? 'var(--accent)' : 'var(--border)',
            color: isValid ? 'white' : 'var(--ink3)', border: 'none', borderRadius: 'var(--radius-sm)',
            fontWeight: 'bold', cursor: isValid ? 'pointer' : 'not-allowed', fontSize: '14px',
          }}
        >
          Continue →
        </button>
      )}
    </div>
  );
}