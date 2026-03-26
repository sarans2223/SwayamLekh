import React from 'react';
import SecurityCodeModal from './SecurityCodeModal';

export default function AlarmOverlay({ isVisible, studentName, questionNo, onCodeSubmit, onClose }) {
  if (!isVisible) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(220, 38, 38, 0.4)', animation: 'alarmPulse 2s infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'var(--surface)', padding: '48px', borderRadius: 'var(--radius)', boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)', maxWidth: '500px', width: '90%', textAlign: 'center', position: 'relative', zIndex: 10001, animation: 'fadeUp 0.3s ease-out' }}>
        <h1 style={{ color: 'var(--red)', fontSize: '32px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          🚨 HELP REQUESTED
        </h1>
        <p style={{ fontSize: '20px', fontWeight: 500, color: 'var(--ink)', marginBottom: '8px' }}>
          {studentName} (Question {questionNo})
        </p>
        <p style={{ color: 'var(--ink2)', marginBottom: '32px' }}>
          Hall Supervisor: Please attend to this student.
        </p>
        
        <SecurityCodeModal onCorrectCode={onCodeSubmit} onClose={onClose} embed />
      </div>
    </div>
  );
}