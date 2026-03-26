import React from 'react';
import { STATUS_CONFIG, STATUS } from '../../constants/questionStatus';

export default function QuestionStatus({ status = STATUS.NOT_ATTEMPTED }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[STATUS.NOT_ATTEMPTED];
  
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: config.bg, border: `1px solid ${config.color === 'white' ? 'transparent' : 'var(--border)'}` }} />
      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink2)' }}>{config.label}</span>
    </div>
  );
}