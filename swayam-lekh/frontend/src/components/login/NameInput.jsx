import React, { useState } from 'react';
import { Mic, CheckCircle2 } from 'lucide-react';

export default function NameInput({ label, value, onChange, placeholder }) {
  const [reading, setReading] = useState(false);

  const handleBlur = () => {
    if (value && value.length > 2) {
      setReading(true);
      setTimeout(() => setReading(false), 2000);
    }
  };

  const isValid = value && value.length > 2;

  const style = {
    width: '100%',
    padding: '16px',
    paddingRight: '60px',
    fontSize: '18px',
    borderRadius: 'var(--radius-sm)',
    border: `2px solid ${isValid ? 'var(--green)' : 'var(--border)'}`,
    outline: 'none',
    backgroundColor: isValid ? 'var(--green-light)' : 'var(--surface)'
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '8px', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {reading && <span style={{ color: 'var(--accent)', animation: 'pulse 1s infinite' }}>🔊 Reading back...</span>}
      </div>
      <div style={{ position: 'relative' }}>
        <input 
          value={value || ''} 
          onChange={e => onChange(e.target.value)} 
          onBlur={handleBlur}
          placeholder={placeholder} 
          style={style} 
        />
        <div style={{ position: 'absolute', right: '12px', top: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isValid && !reading && <CheckCircle2 size={24} color="var(--green)" />}
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <Mic size={24} color="var(--ink2)" />
          </button>
        </div>
      </div>
    </div>
  );
}