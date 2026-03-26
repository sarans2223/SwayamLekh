import React, { useState } from 'react';
import Button from '../ui/Button';

export default function SecurityCodeModal({ onCorrectCode, onClose, embed = false }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code === '12345') {
      setError('');
      onCorrectCode();
    } else {
      setError('Invalid security code');
      setCode('');
    }
  };

  const content = (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--ink)' }}>
        Supervisor Security Code
      </label>
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter 5-digit code"
        maxLength={5}
        style={{ width: '100%', padding: '16px', fontSize: '24px', textAlign: 'center', letterSpacing: '8px', borderRadius: 'var(--radius-sm)', border: `2px solid ${error ? 'var(--red)' : 'var(--border)'}`, marginBottom: '16px', outline: 'none' }}
        autoFocus
      />
      {error && <div style={{ color: 'var(--red)', fontSize: '14px', marginBottom: '16px', fontWeight: 500 }}>{error}</div>}
      <div style={{ display: 'flex', gap: '12px' }}>
        {!embed && <Button type="button" variant="outline" onClick={onClose} fullWidth>Cancel</Button>}
        <Button onClick={handleSubmit} variant="primary" fullWidth>Unlock</Button>
      </div>
    </form>
  );

  if (embed) return content;

  // Ideally this would use Modal component, but to avoid circular deps or complex passing, we just return content if 'embed' is true, which is how AlarmOverlay uses it.
  return (
     <div style={{ padding: '24px' }}>{content}</div>
  );
}