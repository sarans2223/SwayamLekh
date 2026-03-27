import React, { createContext, useContext, useReducer } from 'react';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';

const ExamContext = createContext();

const EXAM_DURATION = 10800; // 3 hours in seconds

const initialState = {
  questions: SAMPLE_QUESTIONS,
  currentIndex: 0,
  answers: {},       // { [questionId]: string }
  flags: [],         // array of flagged questionIds
  startTime: EXAM_DURATION,
  isCountdown: false,
  countdownSeconds: 3,
  isAlarm: false,
  showSecurityModal: false,
  submitted: false,
};

function examReducer(state, action) {
  switch (action.type) {
    case 'NEXT_QUESTION':
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1) };
    case 'PREV_QUESTION':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'JUMP_TO_QUESTION':
      return { ...state, currentIndex: action.payload };
    case 'UPDATE_ANSWER':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.answer } };
    case 'TOGGLE_FLAG': {
      const flagged = state.flags.includes(action.questionId);
      return { ...state, flags: flagged ? state.flags.filter(id => id !== action.questionId) : [...state.flags, action.questionId] };
    }
    case 'TRIGGER_ALARM':
      return { ...state, isAlarm: true };
    case 'DISMISS_ALARM':
      return { ...state, isAlarm: false };
    case 'SHOW_SECURITY_MODAL':
      return { ...state, showSecurityModal: true };
    case 'HIDE_SECURITY_MODAL':
      return { ...state, showSecurityModal: false };
    case 'SUBMIT_EXAM':
      return { ...state, submitted: true, showSecurityModal: false };
    default:
      return state;
  }
}

export function ExamProvider({ children }) {
  const [state, dispatch] = useReducer(examReducer, initialState);

  const nextQuestion = () => dispatch({ type: 'NEXT_QUESTION' });
  const prevQuestion = () => dispatch({ type: 'PREV_QUESTION' });
  const jumpToQuestion = (idx) => dispatch({ type: 'JUMP_TO_QUESTION', payload: idx });
  const updateAnswer = (questionId, answer) => dispatch({ type: 'UPDATE_ANSWER', questionId, answer });
  const toggleFlag = (questionId) => dispatch({ type: 'TOGGLE_FLAG', questionId });
  const triggerAlarm = () => dispatch({ type: 'TRIGGER_ALARM' });
  const dismissAlarm = () => dispatch({ type: 'DISMISS_ALARM' });
  const submitExam = () => dispatch({ type: 'SHOW_SECURITY_MODAL' });
  const confirmSubmit = () => dispatch({ type: 'SUBMIT_EXAM' });

  return (
    <ExamContext.Provider value={{
      state,
      nextQuestion,
      prevQuestion,
      jumpToQuestion,
      updateAnswer,
      toggleFlag,
      triggerAlarm,
      dismissAlarm,
      submitExam,
      confirmSubmit,
    }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  return useContext(ExamContext);
}