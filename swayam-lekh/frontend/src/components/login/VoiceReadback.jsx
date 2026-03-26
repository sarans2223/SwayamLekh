import React from 'react';
import { Volume2 } from 'lucide-react';

export default function VoiceReadback({ text, isReading }) {
  if (!isReading || !text) return null;

  const style = {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--ink)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: 'var(--shadow-lg)',
    animation: 'fadeUp 0.3s ease-out',
    zIndex: 1000,
    fontWeight: 500
  };

  return (
    <div style={style}>
      <Volume2 size={24} style={{ animation: 'pulse 1.5s infinite' }} />
      Reading: "{text}"
    </div>
  );
}