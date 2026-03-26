import React from 'react';

export default function QuestionSidebar({ questions = [], answers = {}, flags = [], currentIndex, onJump }) {
  const getStatus = (qId) => {
    const isAnswered = !!answers[qId];
    const isFlagged = flags.includes(qId);
    
    if (isAnswered && isFlagged) return 'answered-flagged';
    if (isFlagged) return 'flagged';
    if (isAnswered) return 'answered';
    return 'not-visited';
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'answered': return { backgroundColor: 'var(--green)', color: 'white', border: '1px solid var(--green)' };
      case 'flagged': return { backgroundColor: 'var(--red)', color: 'white', border: '1px solid var(--red)' };
      case 'answered-flagged': return { backgroundColor: 'var(--amber)', color: 'white', border: '1px solid var(--amber)' };
      case 'not-visited': return { backgroundColor: '#F0F0F0', color: '#000', border: '1px solid #CCC' };
      default: return { backgroundColor: 'white', color: '#000', border: '1px solid #CCC' };
    }
  };

  const paletteStyle = {
    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '16px'
  };

  const boxStyle = {
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
    fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid #CCC',
    borderRadius: '4px', position: 'relative'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #EEE', paddingBottom: '8px' }}>
        Question Palette
      </h3>
      
      <div style={paletteStyle}>
        {questions.map((q, i) => {
          const status = getStatus(q.id);
          const active = currentIndex === i;
          const sStyle = getStatusStyle(status);
          
          return (
            <div 
              key={q.id} 
              style={{ ...boxStyle, ...sStyle, outline: active ? '2px solid black' : 'none', outlineOffset: '2px' }}
              onClick={() => onJump(i)}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid #EEE', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <div style={{ ...boxStyle, backgroundColor: '#F0F0F0' }}>0</div> Not Visited
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <div style={{ ...boxStyle, backgroundColor: 'var(--green)', color: 'white' }}>0</div> Answered
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <div style={{ ...boxStyle, backgroundColor: 'var(--red)', color: 'white' }}>0</div> Marked for Review
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            <div style={{ ...boxStyle, backgroundColor: 'var(--amber)', color: 'white' }}>0</div> Answered & Marked
         </div>
      </div>
    </div>
  );
}