import React, { useEffect, useRef } from 'react';
import katex from 'katex';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function MathText({ text, style }) {
  const mathRef = useRef(null);

  useEffect(() => {
    if (!mathRef.current) return;
    const source = text || '';

    const parts = [];
    // Match common math delimiters: $$...$$, $...$, \[...\], \(...\)
    const mathRegex = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
    let lastIndex = 0;
    let match;

    while ((match = mathRegex.exec(source)) !== null) {
      const before = source.slice(lastIndex, match.index);
      if (before) {
        parts.push({ type: 'text', value: before });
      }
      
      // Extract the raw math without the delimiters for rendering
      let rawMath = match[0];
      const isBlock = rawMath.startsWith('$$') || rawMath.startsWith('\\[');
      rawMath = rawMath.replace(/^\$\$|\$\$$|^\\\[|\\\]$|^\$|\$$|^\\\(|\\\)$/g, '');
      
      parts.push({ type: 'math', value: rawMath, displayMode: isBlock });
      lastIndex = mathRegex.lastIndex;
    }

    const tail = source.slice(lastIndex);
    if (tail) {
      parts.push({ type: 'text', value: tail });
    }

    const normalizedParts = parts.length ? parts : [{ type: 'text', value: source }];

    try {
      const html = normalizedParts
        .map((part) => {
          if (part.type === 'text') {
            // Replace newlines with <br> for proper formatting and safely inject text
            const safeText = part.value
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br/>');
            // Adding normal whiteSpace handling to text spans
            return `<span style="white-space: pre-wrap; font-style: normal; font-weight: normal; font-family: inherit;">${safeText}</span>`;
          }

          const rendered = katex.renderToString(part.value, {
            throwOnError: false,
            displayMode: part.displayMode,
          });
          return `<span class="inline-math">${rendered}</span>`;
        })
        .join('');

      mathRef.current.innerHTML = html;

      const katexNodes = mathRef.current.querySelectorAll('.inline-math .katex');
      katexNodes.forEach((node) => {
        node.style.whiteSpace = 'nowrap';
        node.style.maxWidth = '100%';
        node.style.display = 'inline-block';
      });

      const nonItalicMathNodes = mathRef.current.querySelectorAll('.inline-math .mathnormal, .inline-math .mathit');
      nonItalicMathNodes.forEach((node) => {
        node.style.fontStyle = 'normal';
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
        whiteSpace: 'pre-wrap',       // Ensure parent respects spaces and newlines
        wordSpacing: 'normal'         // Enforce default word spacing
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
    fontFamily: 'var(--font-sans)',
    fontStyle: 'normal',
    letterSpacing: '0.01em',
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