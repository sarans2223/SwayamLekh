import React, { createContext, useContext, useState } from 'react';
import { STATUS } from '../constants/questionStatus';

const ExamContext = createContext();

export function ExamProvider({ children }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStatuses, setQuestionStatuses] = useState({});
  const [flags, setFlags] = useState([]);
  const [examMode, setExamMode] = useState('COMMAND'); // COMMAND or ANSWER or READING or WAITING
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  const updateAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const updateStatus = (questionId, status) => {
    setQuestionStatuses(prev => ({ ...prev, [questionId]: status }));
  };

  return (
    <ExamContext.Provider value={{
      currentQuestion, setCurrentQuestion,
      answers, updateAnswer,
      questionStatuses, updateStatus,
      flags, setFlags,
      examMode, setExamMode,
      isAlarmActive, setIsAlarmActive,
      examStarted, setExamStarted
    }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  return useContext(ExamContext);
}