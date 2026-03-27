import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExam } from '../context/ExamContext';
import { useStudent } from '../context/StudentContext';
import { useVoice } from '../context/VoiceContext';
import { useExamTimer } from '../hooks/useExamTimer';

import ExamHeader       from '../components/exam/ExamHeader';
import QuestionPanel    from '../components/exam/QuestionPanel';
import AnswerBox        from '../components/exam/AnswerBox';
import QuestionSidebar  from '../components/exam/QuestionSidebar';
import ModeStatusBar    from '../components/exam/ModeStatusBar';
import CountdownOverlay from '../components/exam/CountdownOverlay';
import AlarmOverlay     from '../components/exam/AlarmOverlay';
import SecurityCodeModal from '../components/exam/SecurityCodeModal';
import MalpracticeModal from '../components/exam/MalpracticeModal';

import { startVoiceMonitoring, stopVoiceMonitoring } from '../utils/voiceMonitor';

export default function ExamPage() {
  const navigate = useNavigate();
  const {
    state,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    updateAnswer,
    toggleFlag,
    submitExam,
    confirmSubmit,
    dismissAlarm,
  } = useExam();

  const { student }                         = useStudent();
  const { mode, lastCommand }               = useVoice();
  const { timeLeft, formatted, isWarning, isCritical } = useExamTimer(state.startTime);

  // ── Voice mismatch state ────────────────────────────────────────────────
  const [malpractice, setMalpractice] = useState(null); // null | { score, at }

  // ── handleMismatch callback (stable ref) ────────────────────────────────
  const handleMismatch = useCallback((similarityScore) => {
    setMalpractice({ score: similarityScore, at: new Date().toISOString() });
  }, []);

  // ── Start voice monitoring on mount, stop on unmount ───────────────────
  useEffect(() => {
    if (student?.registerNo) {
      startVoiceMonitoring(student.registerNo, student.name, handleMismatch);
    }
    return () => stopVoiceMonitoring();
  }, [student?.registerNo]);

  // ── Navigate to finish when exam submitted ──────────────────────────────
  useEffect(() => {
    if (state.submitted) navigate('/finish');
  }, [state.submitted]);

  const currentQuestion = state.questions[state.currentIndex];
  const currentAnswer   = state.answers[currentQuestion?.id] || '';
  const isFlagged       = currentQuestion ? state.flags.includes(currentQuestion.id) : false;

  if (!currentQuestion) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Loading exam…</div>;
  }

  // ─── Layout styles ────────────────────────────────────────────────────────
  const grid = {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gridTemplateRows: '52px 1fr 48px',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg)',
    fontFamily: 'var(--font-sans)',
  };

  const navBtn = {
    padding: '0 20px', border: 'none', borderLeft: '1px solid var(--border)',
    backgroundColor: '#EEE', fontWeight: 'bold', fontSize: 13,
    cursor: 'pointer', textTransform: 'uppercase',
  };

  const submitBtn = {
    padding: '0 24px', border: 'none', borderLeft: '1px solid var(--border)',
    backgroundColor: isCritical ? 'var(--red)' : 'var(--accent)',
    color: 'white', fontWeight: 'bold', fontSize: 13,
    cursor: 'pointer', textTransform: 'uppercase',
  };

  return (
    <div style={grid}>

      {/* ── Header ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 1 }}>
        <ExamHeader
          timeLeft={timeLeft}
          formatted={formatted}
          isWarning={isWarning}
          isCritical={isCritical}
          studentName={student.name}
          regNo={student.registerNo}
        />
      </div>

      {/* ── Main: Question + Answer ── */}
      <div style={{ gridColumn: 1, gridRow: 2, display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto', gap: 16 }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius-md)' }}>
          <QuestionPanel
            question={currentQuestion}
            isFlagged={isFlagged}
            onToggleFlag={() => toggleFlag(currentQuestion.id)}
          />
        </div>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <AnswerBox
            answer={currentAnswer}
            onAnswerChange={(val) => updateAnswer(currentQuestion.id, val)}
            isActive={mode === 'ANSWER'}
            subjectMode={student.subjectMode}
          />
        </div>
      </div>

      {/* ── Right sidebar: Question palette ── */}
      <div style={{ gridColumn: 2, gridRow: 2, backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: 16, overflowY: 'auto' }}>
        <QuestionSidebar
          questions={state.questions}
          answers={state.answers}
          flags={state.flags}
          currentIndex={state.currentIndex}
          onJump={jumpToQuestion}
        />

        {/* Voice monitoring status badge */}
        <VoiceStatusBadge />
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 3, borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          <ModeStatusBar mode={mode} lastCommand={lastCommand} />
        </div>
        <button style={navBtn} onClick={prevQuestion}>◀ Prev</button>
        <button style={navBtn} onClick={nextQuestion}>Next ▶</button>
        <button style={submitBtn} onClick={submitExam}>Submit Exam</button>
      </div>

      {/* ── Overlays ── */}
      {state.isCountdown && <CountdownOverlay seconds={state.countdownSeconds} />}

      {state.isAlarm && (
        <AlarmOverlay
          isVisible={state.isAlarm}
          studentName={student.name}
          questionNo={state.currentIndex + 1}
          onCodeSubmit={dismissAlarm}
          onClose={dismissAlarm}
        />
      )}

      {state.showSecurityModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: 40, borderRadius: 'var(--radius-md)', maxWidth: 400, width: '90%' }}>
            <h2 style={{ marginBottom: 8, fontSize: 18 }}>Confirm Submission</h2>
            <p style={{ marginBottom: 24, fontSize: 14, color: 'var(--ink3)' }}>
              Enter the Supervisor Security Code (default: <strong>12345</strong>) to submit the exam.
            </p>
            <SecurityCodeModal onCorrectCode={confirmSubmit} onClose={() => {}} embed={false} />
          </div>
        </div>
      )}

      {/* ── MALPRACTICE MODAL — only closes with code 12345 ── */}
      {malpractice && (
        <MalpracticeModal
          similarityScore={malpractice.score}
          detectedAt={malpractice.at}
          onClose={() => setMalpractice(null)}
        />
      )}
    </div>
  );
}

// ── Small voice status indicator shown in sidebar ─────────────────────────────
function VoiceStatusBadge() {
  const [active, setActive] = useState(true);

  // Pulse every 30s to show it's alive
  useEffect(() => {
    const id = setInterval(() => {
      setActive(false);
      setTimeout(() => setActive(true), 800);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      marginTop: 20, padding: '10px 14px', borderRadius: 6,
      backgroundColor: active ? 'rgba(39,174,96,0.1)' : 'rgba(200,200,200,0.15)',
      border: `1px solid ${active ? 'rgba(39,174,96,0.4)' : '#ddd'}`,
      display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.4s',
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        backgroundColor: active ? '#27ae60' : '#ccc',
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontSize: 11, fontWeight: 'bold', color: active ? '#27ae60' : '#aaa' }}>
          Voice Monitor {active ? 'Active' : '…'}
        </div>
        <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>
          Checks every 30 seconds
        </div>
      </div>
    </div>
  );
}