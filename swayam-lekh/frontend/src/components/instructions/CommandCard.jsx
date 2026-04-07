import React from 'react';

export default function CommandCard({ command, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', backgroundColor: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
      <span style={{ 
        fontFamily: 'monospace', 
        fontWeight: 700, 
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '6px 12px',
        borderRadius: '20px',
        color: 'var(--accent)',
        whiteSpace: 'nowrap'
      }}>
        {command}
      </span>
      <span style={{ color: 'var(--ink2)' }}>{description}</span>
    </div>
  );
}