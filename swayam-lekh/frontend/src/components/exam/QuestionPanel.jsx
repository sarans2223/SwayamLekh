import React, { useEffect, useRef } from 'react';
import katex from 'katex';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function MathText({ text, style }) {
  const mathRef = useRef(null);

  useEffect(() => {
    if (!mathRef.current) return;
    const source = text || '';

    const parts = [];
    const textRegex = /\\text\{([^{}]*)\}/g;
    let lastIndex = 0;
    let match;

    while ((match = textRegex.exec(source)) !== null) {
      const before = source.slice(lastIndex, match.index).trim();
      if (before) {
        parts.push({ type: 'math', value: before });
      }
      parts.push({ type: 'text', value: match[1] });
      lastIndex = textRegex.lastIndex;
    }

    const tail = source.slice(lastIndex).trim();
    if (tail) {
      parts.push({ type: 'math', value: tail });
    }

    const normalizedParts = parts.length ? parts : [{ type: 'text', value: source }];

    try {
      const html = normalizedParts
        .map((part) => {
          if (part.type === 'text') {
            return `<span>${part.value}</span>`;
          }

          const rendered = katex.renderToString(part.value, {
            throwOnError: false,
            displayMode: false,
          });
          return `<span class="inline-math">${rendered}</span>`;
        })
        .join(' ');

      mathRef.current.innerHTML = html;

      const katexNodes = mathRef.current.querySelectorAll('.inline-math .katex');
      katexNodes.forEach((node) => {
        node.style.whiteSpace = 'normal';
        node.style.maxWidth = '100%';
        node.style.display = 'inline';
      });
    } catch (_) {
      mathRef.current.textContent = source;
    }
  }, [text]);

  return (
    <div
      ref={mathRef}
      style={{
        ...style,
        overflow: 'hidden',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    />
  );
}

export default function QuestionPanel({ question, isFlagged, onToggleFlag }) {

  if (!question) return null;

  const titleStyle = {
    fontSize: '16px', fontWeight: 'bold', color: 'var(--accent)',
    marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px',
  };

  const questionTextStyle = {
    fontSize: '15px', lineHeight: 1.7,
    color: 'var(--ink)', marginBottom: '24px',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    maxWidth: '100%',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '16px 20px',
      }}
    >
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

      <MathText text={question.text} style={questionTextStyle} />

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