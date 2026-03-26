import React from 'react';

export default function Divider({ label }) {
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0',
    color: 'var(--ink3)'
  };

  const lineStyle = {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--border)'
  };

  if (!label) {
    return <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '24px 0' }} />;
  }

  return (
    <div style={containerStyle}>
      <div style={lineStyle} />
      <span style={{ padding: '0 12px', fontSize: '14px', fontWeight: 500 }}>{label}</span>
      <div style={lineStyle} />
    </div>
  );
}