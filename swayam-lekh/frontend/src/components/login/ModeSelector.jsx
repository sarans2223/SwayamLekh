import React from 'react';
import { DISABILITY_MODES, SUBJECT_MODES } from '../../constants/modes';

export default function ModeSelector({ disabilityMode, onDisabilityChange, subjectMode, onSubjectChange }) {
  const renderCard = (mode, isSelected, onClick) => {
    const style = {
      flex: 1,
      minWidth: '120px',
      padding: '16px',
      borderRadius: 'var(--radius)',
      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
      backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--surface)',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    };

    return (
      <div key={mode.id} style={style} onClick={() => onClick(mode.id)}>
        <div style={{ fontSize: '32px' }}>{mode.icon}</div>
        <div style={{ fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--ink)' }}>{mode.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--ink2)' }}>{mode.desc}</div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
         <h3 style={{ marginBottom: '16px' }}>Student Disability Mode</h3>
         <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
           {DISABILITY_MODES.map(mode => renderCard(mode, mode.id === disabilityMode, onDisabilityChange))}
         </div>
      </div>
      <div>
         <h3 style={{ marginBottom: '16px' }}>Exam Subject Mode</h3>
         <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
           {SUBJECT_MODES.map(mode => renderCard(mode, mode.id === subjectMode, onSubjectChange))}
         </div>
      </div>
    </div>
  );
}