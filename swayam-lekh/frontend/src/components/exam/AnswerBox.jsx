import React, { useRef, useEffect } from 'react';
import { Mic, TerminalSquare } from 'lucide-react';
import EquationRenderer from './EquationRenderer';

export default function AnswerBox({ answer = "", isActive, onAnswerChange, subjectMode }) {
  const contentEditableRef = useRef(null);

  useEffect(() => {
    // Basic sync for mock purposes
    if (contentEditableRef.current && contentEditableRef.current.innerText !== answer && !hasLatexContent(answer)) {
      contentEditableRef.current.innerText = answer;
    }
  }, [answer]);

  const hasLatexContent = (text) => {
    return text.includes('\\') || text.includes('^') || text.includes('_');
  };

  const handleInput = (e) => {
    if (onAnswerChange) {
      onAnswerChange(e.target.innerText);
    }
  };

  const wordCount = answer ? answer.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  
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
      
      {(subjectMode === 'maths' || subjectMode === 'chemistry') && answer && hasLatexContent(answer) ? (
        <div style={{ padding: '24px', minHeight: '150px', fontSize: '20px' }}>
          <EquationRenderer latex={answer} inline={false} />
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
        <span>Characters: {answer.length}</span>
        <span>Auto-saved locally</span>
      </div>
    </div>
  );
}