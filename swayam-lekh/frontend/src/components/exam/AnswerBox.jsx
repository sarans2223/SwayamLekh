import React, { useRef, useEffect, useMemo } from 'react';
import { Mic, TerminalSquare } from 'lucide-react';
import EquationRenderer from './EquationRenderer';
import { getPartAnswer } from '../../utils/questionParts';

export default function AnswerBox({ answer = "", isActive, onAnswerChange, subjectMode, questionParts = [], activePartKey, onActivePartChange }) {
  const contentEditableRef = useRef(null);
  const isPartQuestion = questionParts.length > 0;

  useEffect(() => {
    // Basic sync for mock purposes
    if (!isPartQuestion && contentEditableRef.current && contentEditableRef.current.innerText !== answer && !hasLatexContent(answer)) {
      contentEditableRef.current.innerText = answer;
    }
  }, [answer, isPartQuestion]);

  const hasLatexContent = (text) => {
    if (!text) return false;
    // Trigger math rendering on LaTeX commands (\), powers (^), subscripts (_),
    // or common mathematical operators that deserve KaTeX formatting.
    // Note: We use \ as the primary indicator for complex symbols.
    const latexIndicators = /[\\^_⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉=+\-×÷±<>]|\\int|\\sum|\\sqrt|\\ge|\\le|\\pm|\\neq/;
    return latexIndicators.test(text);
  };

  const handleInput = (e) => {
    if (onAnswerChange) {
      onAnswerChange(e.target.innerText);
    }
  };

  const wordCount = useMemo(() => {
    if (isPartQuestion) {
      return questionParts.reduce((total, part) => {
        const partAnswer = getPartAnswer(answer, part.key, questionParts)
        const words = partAnswer ? partAnswer.trim().split(/\s+/).filter((w) => w.length > 0).length : 0
        return total + words
      }, 0)
    }
    return answer ? answer.trim().split(/\s+/).filter(w => w.length > 0).length : 0
  }, [answer, isPartQuestion, questionParts]);
  
  const charCount = useMemo(() => {
    if (isPartQuestion) {
      return questionParts.reduce((total, part) => {
        const partAnswer = getPartAnswer(answer, part.key, questionParts)
        return total + (partAnswer ? partAnswer.length : 0)
      }, 0)
    }
    return typeof answer === 'string' ? answer.length : 0
  }, [answer, isPartQuestion, questionParts])
  
  const containerClass = `answer-box-container ${isActive ? 'active-answer' : 'active-command'}`;

  return (
    <div className={containerClass}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface2)', borderTopLeftRadius: 'calc(var(--radius) - 2px)', borderTopRightRadius: 'calc(var(--radius) - 2px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--ink)' }}>
          {isActive ? <Mic size={20} color="var(--red)" /> : <TerminalSquare size={20} color="var(--accent)" />}
          <span>Your Answer</span>
          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', marginLeft: '8px' }}>
            {wordCount} words
          </span>
        </div>
        <div style={{ fontWeight: 600, color: isActive ? 'var(--red)' : 'var(--accent)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isActive ? '🔴 Answer Mode' : '🔵 Command Mode'}
        </div>
      </div>
      
      {isPartQuestion ? (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--ink2)', lineHeight: 1.5 }}>
            Say Part A or Part B to switch the active answer section.
          </div>
          {questionParts.map((part) => {
            const partAnswer = getPartAnswer(answer, part.key, questionParts)
            const isActivePart = activePartKey === part.key
            return (
              <label
                key={part.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '16px',
                  borderRadius: '14px',
                  border: `1px solid ${isActivePart ? 'var(--accent)' : 'var(--border)'}`,
                  backgroundColor: isActivePart ? 'var(--surface2)' : 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{part.label}</span>
                  <button
                    type="button"
                    onClick={() => onActivePartChange?.(part.key)}
                    style={{
                      border: '1px solid var(--border)',
                      background: isActivePart ? 'var(--accent)' : 'var(--surface)',
                      color: isActivePart ? 'white' : 'var(--ink2)',
                      borderRadius: '999px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isActivePart ? 'Active' : 'Switch'}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink2)' }}>{part.text}</div>
                <textarea
                  value={partAnswer}
                  onChange={(e) => onAnswerChange?.(part.key, e.target.value)}
                  onFocus={() => onActivePartChange?.(part.key)}
                  placeholder={`Answer for ${part.label}`}
                  style={{
                    minHeight: '120px',
                    width: '100%',
                    resize: 'vertical',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '14px',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    color: 'var(--ink)',
                    backgroundColor: 'var(--surface)',
                    outline: 'none',
                  }}
                />
              </label>
            )
          })}
        </div>
      ) : (subjectMode === 'maths' || subjectMode === 'chemistry') && answer && hasLatexContent(answer) ? (
        <div style={{ padding: '24px', minHeight: '150px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {answer.split('\n').map((line, idx) => (
            line.trim() ? (
              <EquationRenderer key={`eq-${idx}`} latex={line.trim()} inline={false} />
            ) : (
              <div key={`br-${idx}`} style={{ height: '1.2em' }} /> // Preserve blank lines
            )
          ))}
        </div>
      ) : (
        <div 
          ref={contentEditableRef}
          className="answer-content"
          contentEditable={true}
          onInput={handleInput}
          data-placeholder="Your answer will appear here as you speak..."
          suppressContentEditableWarning={true}
        />
      )}
      
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--ink3)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Characters: {charCount}</span>
        <span>Auto-saved locally</span>
      </div>
    </div>
  );
}