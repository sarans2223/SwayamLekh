import React, { createContext, useCallback, useContext, useMemo, useReducer, useEffect, useState } from 'react';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';
import { MATHS_SAMPLE_QUESTIONS } from '../data/mathsSampleQuestions';

const ExamContext = createContext();

const EXAM_DURATION = 10800; // 3 hours in seconds

const getInitialQuestions = () => {
  try {
    const saved = sessionStorage.getItem('swayam_student');
    if (saved) {
      const student = JSON.parse(saved);
      if (student?.subjectMode === 'maths') return MATHS_SAMPLE_QUESTIONS;
    }
  } catch (err) {
    console.warn('[exam-context] Failed to read saved student profile', err);
  }
  return SAMPLE_QUESTIONS;
};

const initialState = {
  questions: getInitialQuestions(),
  currentIndex: 0,
  answers: {},       // { [questionId]: string }
  flags: [],         // array of flagged questionIds
  startTime: EXAM_DURATION,
  isCountdown: false,
  countdownSeconds: 3,
  isAlarm: false,
  showSecurityModal: false,
  submitted: false,
  timeLeft: EXAM_DURATION,
  timerActive: false,
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
    case 'SET_QUESTIONS':
      return {
        ...state,
        questions: action.questions,
        currentIndex: 0,
        answers: {},
        flags: [],
      };
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
      return { ...state, submitted: true, showSecurityModal: false, timerActive: false };
    case 'START_TIMER':
      return { ...state, timerActive: true };
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.payload };
    default:
      return state;
  }
}

export function ExamProvider({ children }) {
  const [state, dispatch] = useReducer(examReducer, initialState);

  const nextQuestion = useCallback(() => dispatch({ type: 'NEXT_QUESTION' }), []);
  const prevQuestion = useCallback(() => dispatch({ type: 'PREV_QUESTION' }), []);
  const jumpToQuestion = useCallback((idx) => dispatch({ type: 'JUMP_TO_QUESTION', payload: idx }), []);
  const updateAnswer = useCallback((questionId, answer) => dispatch({ type: 'UPDATE_ANSWER', questionId, answer }), []);
  const setQuestions = useCallback((questions) => dispatch({ type: 'SET_QUESTIONS', questions }), []);
  const toggleFlag = useCallback((questionId) => dispatch({ type: 'TOGGLE_FLAG', questionId }), []);
  const triggerAlarm = useCallback(() => dispatch({ type: 'TRIGGER_ALARM' }), []);
  const dismissAlarm = useCallback(() => dispatch({ type: 'DISMISS_ALARM' }), []);
  const submitExam = useCallback(() => dispatch({ type: 'SHOW_SECURITY_MODAL' }), []);
  const confirmSubmit = useCallback(() => dispatch({ type: 'SUBMIT_EXAM' }), []);
  const startExamTimer = useCallback(() => dispatch({ type: 'START_TIMER' }), []);

  useEffect(() => {
    let interval;
    if (state.timerActive && state.timeLeft > 0) {
      interval = setInterval(() => {
        dispatch({ type: 'SET_TIME_LEFT', payload: state.timeLeft - 1 });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.timerActive, state.timeLeft]);

  const formattedTime = useMemo(() => {
    return new Date(state.timeLeft * 1000).toISOString().substring(11, 19);
  }, [state.timeLeft]);

  const value = useMemo(() => ({
    state,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    updateAnswer,
    setQuestions,
    toggleFlag,
    triggerAlarm,
    dismissAlarm,
    submitExam,
    confirmSubmit,
    startExamTimer,
    formattedTime,
  }), [
    state,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    updateAnswer,
    setQuestions,
    toggleFlag,
    triggerAlarm,
    dismissAlarm,
    submitExam,
    confirmSubmit,
    startExamTimer,
    formattedTime,
  ]);

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  return useContext(ExamContext);
}