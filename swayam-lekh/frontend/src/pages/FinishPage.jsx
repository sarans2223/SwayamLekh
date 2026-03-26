import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { useExam } from '../context/ExamContext';
import { SAMPLE_QUESTIONS } from '../data/sampleQuestions';
import { CheckCircle2, FileText, Upload } from 'lucide-react';

import AnswerSummary from '../components/finish/AnswerSummary';
import StatusTable from '../components/finish/StatusTable';
import PDFPreview from '../components/finish/PDFPreview';
import Divider from '../components/ui/Divider';

export default function FinishPage() {
  const { student } = useStudent();
  const { answers, questionStatuses } = useExam();
  const navigate = useNavigate();

  const questions = SAMPLE_QUESTIONS;
  
  let ansCount = 0;
  let skipCount = 0;
  
  questions.forEach(q => {
    if (answers[q.id]) ansCount++;
    else skipCount++;
  });

  const handleDownload = async () => {
    // using html2pdf
    const element = document.getElementById('pdf-summary-container');
    if (window.html2pdf && element) {
      window.html2pdf().from(element).save(`SwayamLekh_${student.registerNo || 'AnswerSheet'}.pdf`);
    } else {
      alert("PDF generation library not loaded correctly. Check network.");
    }
  };

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg)', minHeight: '100vh', padding: '64px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        <div style={{ textAlign: 'center', animation: 'fadeUp 0.6s ease-out' }}>
           <CheckCircle2 size={80} color="var(--green)" style={{ marginBottom: '24px' }} />
           <h1 style={{ fontSize: '48px', color: 'var(--ink)', fontFamily: 'var(--font-heading)', marginBottom: '16px' }}>Exam Completed</h1>
           <p style={{ fontSize: '20px', color: 'var(--ink2)' }}>{student.name || 'Student'} ({student.registerNo || '123456'})</p>
           <p style={{ fontSize: '16px', color: 'var(--ink3)', marginTop: '8px' }}>{new Date().toLocaleString()}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
           <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius)', border: '1px solid var(--green)', textAlign: 'center' }}>
             <div style={{ fontSize: '48px', fontWeight: 600, color: 'var(--green)' }}>{ansCount}</div>
             <div style={{ color: 'var(--ink2)', fontWeight: 500 }}>Questions Answered</div>
           </div>
           <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius)', border: '1px solid var(--amber)', textAlign: 'center' }}>
             <div style={{ fontSize: '48px', fontWeight: 600, color: 'var(--amber)' }}>{skipCount}</div>
             <div style={{ color: 'var(--ink2)', fontWeight: 500 }}>Questions Skipped</div>
           </div>
           <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', textAlign: 'center' }}>
             <div style={{ fontSize: '48px', fontWeight: 600, color: 'var(--accent)' }}>3h</div>
             <div style={{ color: 'var(--ink2)', fontWeight: 500 }}>Time Used</div>
           </div>
        </div>

        <Divider label="Detailed Analysis" />

        <StatusTable questions={questions} statuses={questionStatuses} answers={answers} />

        <Divider label="Answer Sheet" />

        <AnswerSummary 
           studentData={student} 
           answers={answers} 
           questions={questions} 
        />

        <Divider label="Export" />

        <PDFPreview 
           studentData={student} 
           answers={answers} 
           onDownload={handleDownload}
           onUpload={() => alert("Mock upload initiated!")}
        />

        <div style={{ textAlign: 'center', color: 'var(--ink3)', padding: '48px 0' }}>
           Session Complete — Hall Supervisor may securely close this tab.
        </div>
      </div>
    </div>
  );
}