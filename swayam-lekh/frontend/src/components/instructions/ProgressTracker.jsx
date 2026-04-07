import React from 'react';

export default function ProgressTracker({ total, verified }) {
  const percentage = Math.min(100, Math.max(0, (verified / total) * 100));
  const isComplete = verified >= total;

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 600 }}>
        <span>Command Verification</span>
        <span style={{ color: isComplete ? 'var(--green)' : 'var(--ink)' }}>{verified} of {total}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          backgroundColor: isComplete ? 'var(--green)' : 'var(--accent)', 
          width: `${percentage}%`,
          transition: 'width 0.3s ease-out'
        }} />
      </div>
    </div>
  );
}