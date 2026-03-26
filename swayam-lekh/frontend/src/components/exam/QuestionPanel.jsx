import React from 'react';
import EquationRenderer from './EquationRenderer';

export default function QuestionPanel({ question, isFlagged, onToggleFlag }) {
  if (!question) return null;

  const titleStyle = {
    fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px'
  };

  const questionTextStyle = {
    fontSize: '15px', lineHeight: 1.6, color: 'var(--ink)', marginBottom: '24px', fontFamily: 'Arial, sans-serif'
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={titleStyle}>
        <span>Question {question.id}</span>
        {isFlagged && <div style={{ backgroundColor: 'var(--red)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '2px' }}>MARKED FOR REVIEW</div>}
      </div>

      <div style={questionTextStyle}>
        {question.type === 'equation' ? (
          <EquationRenderer equation={question.text} />
        ) : (
          question.text
        )}
      </div>

      {question.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(question.options).map(([key, value]) => (
            <div 
              key={key} 
              style={{ padding: '12px 16px', border: '1px solid #CCC', borderRadius: 'var(--radius)', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            >
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #CCC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                {key.toUpperCase()}
              </div>
              <span style={{ fontSize: '14px' }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}