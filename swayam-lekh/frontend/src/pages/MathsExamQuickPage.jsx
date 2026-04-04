import React, { useEffect, useRef } from 'react';
import ExamPage from './ExamPage';
import { useStudent } from '../context/StudentContext';
import { useExam } from '../context/ExamContext';
import { MATHS_SAMPLE_QUESTIONS } from '../data/mathsSampleQuestions';

export default function MathsExamQuickPage() {
  const { student, updateStudent } = useStudent();
  const { setQuestions } = useExam();
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    updateStudent({
      name: student?.name || 'Maths Demo Student',
      registerNo: student?.registerNo || '12345678',
      subjectMode: 'maths',
      instructionLang: student?.instructionLang || 'en',
    });

    setQuestions(MATHS_SAMPLE_QUESTIONS);
  }, [setQuestions, student?.instructionLang, student?.name, student?.registerNo, updateStudent]);

  return <ExamPage />;
}