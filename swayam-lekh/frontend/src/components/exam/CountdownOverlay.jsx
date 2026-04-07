import React from 'react';

export default function CountdownOverlay({ count, isVisible }) {
  if (!isVisible || count <= 0) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius)' }}>
      <div style={{ fontSize: '120px', fontWeight: 700, color: 'var(--accent)', animation: 'pulse 1s infinite' }}>
        {count}
      </div>
      <h2 style={{ fontSize: '24px', color: 'var(--ink)' }}>Answer mode starting...</h2>
    </div>
  );
}