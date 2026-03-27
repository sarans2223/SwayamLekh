import React from 'react';
import EquationRenderer from './EquationRenderer';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuestionPanel({ question, isFlagged, onToggleFlag }) {
  if (!question) return null;

  const titleStyle = {
    fontSize: '16px', fontWeight: 'bold', color: 'var(--accent)',
    marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px',
  };

  const questionTextStyle = {
    fontSize: '15px', lineHeight: 1.7,
    color: 'var(--ink)', marginBottom: '24px',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={titleStyle}>
        <span>Question {question.id}</span>
        <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--ink3)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '2px' }}>
          {question.type === 'mcq' ? 'MCQ' : 'Long Answer'} • {question.marks} mark{question.marks > 1 ? 's' : ''}
        </span>
        {isFlagged && (
          <div style={{ backgroundColor: 'var(--red)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '2px', marginLeft: 'auto' }}>
            MARKED FOR REVIEW
          </div>
        )}
        <button
          onClick={onToggleFlag}
          style={{
            marginLeft: isFlagged ? '0' : 'auto',
            padding: '3px 10px', fontSize: '12px', fontWeight: 'bold',
            border: `1px solid ${isFlagged ? 'var(--red)' : 'var(--border)'}`,
            background: isFlagged ? 'var(--red-light)' : 'white',
            color: isFlagged ? 'var(--red)' : 'var(--ink3)',
            borderRadius: '2px', cursor: 'pointer',
          }}
        >
          {isFlagged ? '🚩 Unflag' : '🚩 Flag'}
        </button>
      </div>

      <div style={questionTextStyle}>
        {question.text}
      </div>

      {/* MCQ Options — options is an array */}
      {question.options && Array.isArray(question.options) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {question.options.map((option, idx) => (
            <div
              key={idx}
              style={{
                padding: '10px 16px', border: '1px solid #CCC', borderRadius: 'var(--radius)',
                backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center',
                gap: '12px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '2px solid #CCC', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0,
              }}>
                {OPTION_LABELS[idx]}
              </div>
              <span style={{ fontSize: '14px' }}>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}