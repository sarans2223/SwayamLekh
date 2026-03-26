import React from 'react';

export default function ModeStatusBar({ mode, lastCommand }) {
  let bg = 'var(--surface2)';
  let color = 'var(--ink)';
  let text = '';

  switch (mode) {
    case 'ANSWER':
      bg = 'var(--red)';
      color = 'white';
      text = '🔴 ANSWER MODE ACTIVE — Speak your answer';
      break;
    case 'COMMAND':
      bg = 'var(--accent)';
      color = 'white';
      text = '🔵 COMMAND MODE — Waiting for command';
      break;
    case 'READING':
      bg = 'var(--green)';
      color = 'white';
      text = '🟢 READING QUESTION...';
      break;
    case 'WAITING':
      bg = 'var(--amber)';
      color = 'white';
      text = '🟡 Starting answer mode soon...';
      break;
    default:
      text = 'Status Unknown';
  }

  return (
    <div className="exam-status-bar-container" style={{ backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '100%', fontWeight: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', letterSpacing: '0.5px' }}>
        {text}
      </div>
      {lastCommand && (
        <div style={{ fontSize: '13px', opacity: 0.9, backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: '12px' }}>
          Last Command: {lastCommand}
        </div>
      )}
    </div>
  );
}