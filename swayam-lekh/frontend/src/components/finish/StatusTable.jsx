import React from 'react';
import Badge from '../ui/Badge';
import { STATUS_CONFIG, STATUS } from '../../constants/questionStatus';

export default function StatusTable({ questions, statuses, answers }) {
  
  const getWordCount = (ans) => {
    if (!ans) return 0;
    return ans.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--ink2)' }}>Q No.</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--ink2)' }}>Subject</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--ink2)' }}>Status</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--ink2)' }}>Words</th>
            <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--ink2)' }}>Marks</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, idx) => {
            const st = statuses[q.id] || STATUS.NOT_ATTEMPTED;
            const ans = answers[q.id];
            let badgeVar = 'gray';
            if (st === STATUS.ANSWERED) badgeVar = 'green';
            if (st === STATUS.SKIPPED) badgeVar = 'amber';
            if (st === STATUS.FLAGGED) badgeVar = 'red';
            
            return (
              <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 24px', fontWeight: 500 }}>{idx + 1}</td>
                <td style={{ padding: '16px 24px', textTransform: 'capitalize' }}>{q.subject}</td>
                <td style={{ padding: '16px 24px' }}>
                  <Badge variant={badgeVar}>{STATUS_CONFIG[st]?.label || 'Not Attempted'}</Badge>
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--ink2)' }}>{getWordCount(ans)}</td>
                <td style={{ padding: '16px 24px', color: 'var(--ink2)' }}>{q.marks}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}