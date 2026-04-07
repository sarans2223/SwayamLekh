import React from 'react';

export default function Badge({ children, variant = 'gray', dot = false, animated = false }) {
  const colors = {
    blue: { bg: 'var(--accent-light)', text: 'var(--accent)' },
    green: { bg: 'var(--green-light)', text: 'var(--green)' },
    red: { bg: 'var(--red-light)', text: 'var(--red)' },
    amber: { bg: 'var(--amber-light)', text: 'var(--amber)' },
    gray: { bg: 'var(--surface2)', text: 'var(--ink)' },
  };

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: colors[variant]?.bg || colors.gray.bg,
    color: colors[variant]?.text || colors.gray.text,
    fontSize: '13px',
    fontWeight: 600,
  };

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: colors[variant]?.text || colors.gray.text,
    animation: animated ? 'pulse 2s infinite' : 'none',
  };

  return (
    <span style={style}>
      {dot && <span style={dotStyle} />}
      {children}
    </span>
  );
}