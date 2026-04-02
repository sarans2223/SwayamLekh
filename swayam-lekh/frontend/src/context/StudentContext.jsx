import React, { createContext, useContext, useState, useEffect } from 'react';

const StudentContext = createContext();

const DEFAULT_STUDENT = {
  name: '',
  registerNo: '',
  disabilityMode: 'bone',
  subjectMode: 'normal',
  instructionLang: 'en',
  photo: null,
  voiceSample: null,
};

export function StudentProvider({ children }) {
  const [student, setStudent] = useState(() => {
    const saved = sessionStorage.getItem('swayam_student');
    if (!saved) return DEFAULT_STUDENT;
    try {
      return { ...DEFAULT_STUDENT, ...JSON.parse(saved) };
    } catch (err) {
      console.warn('[student-context] Failed to parse session cache', err);
      return DEFAULT_STUDENT;
    }
  });

  useEffect(() => {
    sessionStorage.setItem('swayam_student', JSON.stringify(student));
  }, [student]);

  const updateStudent = (data) => {
    setStudent(prev => ({ ...prev, ...data }));
  };

  return (
    <StudentContext.Provider value={{ student, updateStudent }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  return useContext(StudentContext);
}