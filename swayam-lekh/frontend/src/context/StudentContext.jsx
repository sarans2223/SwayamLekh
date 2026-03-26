import React, { createContext, useContext, useState, useEffect } from 'react';

const StudentContext = createContext();

export function StudentProvider({ children }) {
  const [student, setStudent] = useState(() => {
    const saved = sessionStorage.getItem('swayam_student');
    return saved ? JSON.parse(saved) : {
      name: '',
      registerNo: '',
      hallTicket: '',
      disabilityMode: 'bone',
      subjectMode: 'normal',
      photo: null,
      voiceSample: null
    };
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