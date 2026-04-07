import React from 'react';

export default function Spinner({ size = 24, color = 'var(--accent)' }) {
  const style = {
    display: 'inline-block',
    width: size,
    height: size,
    border: `3px solid ${color}40`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  return <div style={style}></div>;
}