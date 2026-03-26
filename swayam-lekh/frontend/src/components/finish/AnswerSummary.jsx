import React from 'react';
import EquationRenderer from '../exam/EquationRenderer';

export default function AnswerSummary({ studentData, answers, questions, timeUsed }) {
  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--surface)', padding: '40px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }} id="pdf-summary-container">
      <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid var(--ink)', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Swayam Lekh — Answer Sheet</h1>
        <p style={{ fontSize: '18px', color: 'var(--ink2)' }}>Central Examination Board</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px', padding: '24px', backgroundColor: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
        <div>
           <div style={{ fontSize: '13px', color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Name</div>
           <div style={{ fontSize: '20px', fontWeight: 600 }}>{studentData?.name || 'Unknown User'}</div>
        </div>
        <div>
           <div style={{ fontSize: '13px', color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registration No</div>
           <div style={{ fontSize: '20px', fontWeight: 600 }}>{studentData?.registerNo || 'N/A'}</div>
        </div>
        <div>
           <div style={{ fontSize: '13px', color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Completed</div>
           <div style={{ fontSize: '20px', fontWeight: 600 }}>{new Date().toLocaleDateString()}</div>
        </div>
        <div>
           <div style={{ fontSize: '13px', color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disability Mode</div>
           <div style={{ fontSize: '20px', fontWeight: 600, textTransform: 'capitalize' }}>{studentData?.disabilityMode || 'Standard'} Mode</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {questions.map((q, idx) => {
           const ans = answers[q.id];
           return (
             <div key={q.id} style={{ breakInside: 'avoid' }}>
               <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '12px', color: 'var(--ink)' }}>
                 Q{idx + 1}. {q.text}
               </div>
               <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', minHeight: '60px', backgroundColor: 'var(--bg)', fontSize: '18px' }}>
                 {ans ? (
                   (q.subject === 'maths' || q.subject === 'chemistry') ? (
                     <EquationRenderer latex={ans} inline={false} />
                   ) : (
                     ans
                   )
                 ) : (
                   <span style={{ color: 'var(--red)', fontStyle: 'italic' }}>Skipped / Not Answered</span>
                 )}
               </div>
             </div>
           );
        })}
      </div>
      
      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px dashed var(--border)', textAlign: 'center', color: 'var(--ink3)', fontSize: '14px' }}>
        -- End of Answer Sheet --
      </div>
    </div>
  );
}