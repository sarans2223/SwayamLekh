import React from 'react';
import { useExam } from '../context/ExamContext';
import { useStudent } from '../context/StudentContext';
import { useVoice } from '../context/VoiceContext';
import useExamTimer from '../hooks/useExamTimer';

import ExamHeader from '../components/exam/ExamHeader';
import QuestionPanel from '../components/exam/QuestionPanel';
import AnswerBox from '../components/exam/AnswerBox';
import QuestionSidebar from '../components/exam/QuestionSidebar';
import ModeStatusBar from '../components/exam/ModeStatusBar';
import CountdownOverlay from '../components/exam/CountdownOverlay';
import AlarmOverlay from '../components/exam/AlarmOverlay';
import SecurityCodeModal from '../components/exam/SecurityCodeModal';

export default function ExamPage() {
  const { 
    state, 
    nextQuestion, 
    prevQuestion, 
    jumpToQuestion,
    updateAnswer, 
    toggleFlag,
    submitExam 
  } = useExam();
  
  const { student } = useStudent();
  const { isListening, mode } = useVoice();
  const { timeLeft, isTimeUp } = useExamTimer(state.startTime);

  const currentQuestion = state.questions[state.currentIndex];
  const currentAnswer = state.answers[currentQuestion.id] || '';
  const isFlagged = state.flags.includes(currentQuestion.id);

  const examGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 280px', /* Palette on Right */
    gridTemplateRows: '52px 1fr 40px', /* JEE 52px header */
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    fontFamily: 'Arial, sans-serif'
  };

  const mainAreaStyle = {
    gridColumn: '1', gridRow: '2', display: 'flex', flexDirection: 'column', 
    padding: '32px', overflowY: 'auto', gap: '24px'
  };

  const rightAreaStyle = {
    gridColumn: '2', gridRow: '2', backgroundColor: '#FFFFFF', borderLeft: '1px solid #CCC',
    padding: '24px', overflowY: 'auto'
  };

  const bottomBarStyle = {
    gridColumn: '1 / -1', gridRow: '3', borderTop: '1px solid #CCC', backgroundColor: '#FFFFFF',
    display: 'flex', alignItems: 'center', padding: '0 24px', gap: '32px', fontSize: '13px', fontWeight: 'bold'
  };

  return (
    <div style={examGridStyle}>
      <div style={{ gridColumn: '1 / -1', gridRow: '1' }}>
        <ExamHeader timeLeft={timeLeft} studentName={student.name} regNo={student.registerNo} />
      </div>

      <div style={mainAreaStyle}>
         <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CCC', padding: '32px', borderRadius: 'var(--radius)' }}>
           <QuestionPanel 
              question={currentQuestion}
              isFlagged={isFlagged}
              onToggleFlag={() => toggleFlag(currentQuestion.id)}
           />
         </div>
         
         <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CCC', padding: '32px', borderRadius: 'var(--radius)' }}>
           <AnswerBox 
              value={currentAnswer} 
              onChange={(val) => updateAnswer(currentQuestion.id, val)}
              isListening={isListening}
              mode={mode}
           />
         </div>
      </div>

      <div style={rightAreaStyle}>
         <QuestionSidebar 
            questions={state.questions}
            answers={state.answers}
            flags={state.flags}
            currentIndex={state.currentIndex}
            onJump={jumpToQuestion}
         />
      </div>

      <div style={bottomBarStyle}>
         <ModeStatusBar isListening={isListening} mode={mode} />
         <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
            <button onClick={prevQuestion} style={{ padding: '6px 12px', border: '1px solid #CCC', backgroundColor: '#EEE', fontWeight: 'bold' }}>PREVIOUS</button>
            <button onClick={nextQuestion} style={{ padding: '6px 12px', border: '1px solid #CCC', backgroundColor: '#EEE', fontWeight: 'bold' }}>NEXT</button>
            <button onClick={submitExam} style={{ padding: '6px 12px', border: 'none', backgroundColor: 'var(--accent)', color: 'white', fontWeight: 'bold' }}>SUBMIT EXAM</button>
         </div>
      </div>

      {state.isCountdown && <CountdownOverlay seconds={state.countdownSeconds} />}
      {state.isAlarm && <AlarmOverlay />}
      {state.showSecurityModal && <SecurityCodeModal onConfirm={submitExam} onClose={() => {}} />}
    </div>
  );
}