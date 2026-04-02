import React, { useEffect, useMemo, useState } from 'react';
import { hasNonEmptyAnswer } from '../../utils/questionParts';

export default function QuestionSidebar({
  questions = [],
  sections = [],
  answers = {},
  flags = [],
  currentIndex,
  onJump,
  activeSectionId: controlledSectionId,
  onSectionChange,
}) {
  const [internalSectionId, setInternalSectionId] = useState(() => (sections[0]?.id ?? 'all'));

  useEffect(() => {
    if (controlledSectionId) return;
    if (!sections.length) {
      setInternalSectionId('all');
      return;
    }
    setInternalSectionId((prev) => (sections.some((section) => section.id === prev) ? prev : sections[0].id));
  }, [sections, controlledSectionId]);

  const activeSectionId = controlledSectionId ?? internalSectionId;

  const handleSectionSelect = (id) => {
    if (onSectionChange) {
      onSectionChange(id);
    } else {
      setInternalSectionId(id);
    }
  };

  const questionIndexMap = useMemo(() => {
    const map = new Map();
    questions.forEach((question, idx) => {
      map.set(question.id, idx);
    });
    return map;
  }, [questions]);

  const visibleQuestions = useMemo(() => {
    if (!sections.length || activeSectionId === 'all') return questions;
    const activeSection = sections.find((section) => section.id === activeSectionId);
    return activeSection ? activeSection.questions : questions;
  }, [sections, activeSectionId, questions]);

  const activeSectionLabel = useMemo(() => {
    if (!sections.length || activeSectionId === 'all') return 'All Questions';
    const activeSection = sections.find((section) => section.id === activeSectionId);
    if (!activeSection) return 'All Questions';
    return `${activeSection.label} • ${activeSection.marks} mark${activeSection.marks > 1 ? 's' : ''}`;
  }, [sections, activeSectionId]);
  const getStatus = (qId) => {
    const isAnswered = hasNonEmptyAnswer(answers[qId]);
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
        {activeSectionLabel}
      </h3>

      {sections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {sections.map((section) => {
            const isActive = activeSectionId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSectionSelect(section.id)}
                style={{
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  backgroundColor: isActive ? 'rgba(0, 102, 255, 0.08)' : 'white',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  cursor: 'pointer',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>{section.label}</span>
                <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{section.questions.length} questions • {section.marks} mark{section.marks > 1 ? 's' : ''}</span>
              </button>
            );
          })}
        </div>
      )}
      
      <div style={paletteStyle}>
        {visibleQuestions.map((q) => {
          const status = getStatus(q.id);
          const originalIndex = questionIndexMap.get(q.id) ?? 0;
          const active = currentIndex === originalIndex;
          const sStyle = getStatusStyle(status);
          
          return (
            <div 
              key={q.id} 
              style={{ ...boxStyle, ...sStyle, outline: active ? '2px solid black' : 'none', outlineOffset: '2px' }}
              onClick={() => onJump(originalIndex)}
            >
              {originalIndex + 1}
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