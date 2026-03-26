import React from 'react';
import { useExamTimer } from '../../hooks/useExamTimer';
import { Clock } from 'lucide-react';

export default function ExamTimer({ timeRemaining, isWarning, isCritical }) {
  const h = Math.floor(timeRemaining / 3600);
  const m = Math.floor((timeRemaining % 3600) / 60);
  const s = timeRemaining % 60;
  
  const formatted = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  let color = 'var(--ink)';
  let animation = 'none';
  if (isCritical) { color = 'var(--red)'; animation = 'pulse 1s infinite'; }
  else if (isWarning) { color = 'var(--amber)'; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink2)', marginBottom: '8px' }}>
        <Clock size={16} />
        <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Remaining</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: '42px', fontWeight: 700, color, animation }}>
        {formatted}
      </div>
    </div>
  );
}