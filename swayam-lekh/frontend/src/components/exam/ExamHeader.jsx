import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function ExamHeader({ timeLeft = 10800, studentName, regNo, onOpenAssistant }) {
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const headerStyle = {
    height: '52px', backgroundColor: '#1a3a5c', color: 'white', display: 'flex', alignItems: 'center', 
    padding: '0 24px', fontSize: '13px', borderBottom: '1px solid #000', fontWeight: 'bold',
    position: 'relative'
  };

  const timerStyle = {
    backgroundColor: 'white', color: timeLeft < 300 ? '#C0392B' : '#000', padding: '4px 12px', border: '1px solid #CCC',
    borderRadius: 'var(--radius)', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace'
  };

  const navSectionStyle = {
    display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto'
  };

  const helpButtonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  return (
    <div style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
         <div style={{ padding: '4px 8px', border: '1px solid white', borderRadius: 'var(--radius)', textTransform: 'uppercase', fontSize: '11px' }}>SWAYAM LEKH</div>
         
         <button 
           onClick={onOpenAssistant}
           style={helpButtonStyle}
           onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
           onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
         >
           <HelpCircle size={14} />
           Voice Help
         </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
         <span>Roll No: {regNo}</span>
         <span style={{ opacity: 0.8 }}>Candidate: {studentName}</span>
      </div>

      <div style={navSectionStyle}>
         <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8 }}>Time Left:</span>
         <div style={timerStyle}>{formatTime(timeLeft)}</div>
      </div>
    </div>
  );
}