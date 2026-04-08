import React, { useEffect, useRef } from 'react';
import ExamPage from './ExamPage';
import { useStudent } from '../context/StudentContext';
import { useExam } from '../context/ExamContext';
import { CHEMISTRY_SAMPLE_QUESTIONS } from '../data/chemistrySampleQuestions';

export default function ChemistryExamQuickPage() {
  const { student, updateStudent } = useStudent();
  const { setQuestions } = useExam();
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    updateStudent({
      name: student?.name || 'Chemistry Demo Student',
      registerNo: student?.registerNo || '12345678',
      subjectMode: 'chemistry',
      instructionLang: student?.instructionLang || 'en',
    });

    setQuestions(CHEMISTRY_SAMPLE_QUESTIONS);
  }, [setQuestions, student?.instructionLang, student?.name, student?.registerNo, updateStudent]);

  return <ExamPage />;
}
