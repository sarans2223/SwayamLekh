// src/pages/FinishPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useExam } from '../context/ExamContext';
import { useStudent } from '../context/StudentContext';
import { supabase } from '../services/supabaseClient';
import { generateAnswerSheet } from '../services/pdfService';

const containerStyle = {
  minHeight: '100vh',
  padding: '32px 16px',
  display: 'flex',
  justifyContent: 'center',
  background: 'var(--bg)',
};

const cardStyle = {
  width: '100%',
  maxWidth: '920px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
  padding: '28px',
};

const buttonRowStyle = {
  marginTop: '20px',
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

const buttonStyle = {
  border: '1px solid #000',
  background: '#000',
  color: '#fff',
  padding: '10px 16px',
  fontSize: '14px',
  cursor: 'pointer',
};

const ghostButtonStyle = {
  ...buttonStyle,
  background: '#fff',
  color: '#000',
};

function normalizeStudent(student) {
  return {
    name: student?.name || '',
    registerNumber: student?.registerNumber || student?.registerNo || '',
    subject: student?.subject || 'General',
    photo: student?.photo || null,
    disabilityMode: student?.disabilityMode || 'bone',
    subjectMode: student?.subjectMode || 'normal',
    school: student?.school || '',
    date: student?.date || new Date().toLocaleDateString('en-IN'),
  };
}

async function uploadAnswersPayload(student, questions, answers) {
  const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

  const payload = {
    register_number: student.registerNumber,
    student_name: student.name,
    subject: student.subject,
    exam_date: student.date,
    disability_mode: student.disabilityMode,
    subject_mode: student.subjectMode,
    school: student.school,
    answers_json: JSON.stringify(answers || {}),
    questions_json: JSON.stringify(questions || []),
    uploaded_at: new Date().toISOString(),
  };

  if (!hasSupabase) {
    localStorage.setItem(`swayam_answers_${student.registerNumber}`, JSON.stringify(payload));
    return { ok: true, mode: 'local' };
  }

  try {
    const { error } = await supabase.from('exam_answers').insert(payload);
    if (error) {
      if (error.code === 'PGRST205' || /could not find the table/i.test(error.message || '')) {
        localStorage.setItem(`swayam_answers_${student.registerNumber}`, JSON.stringify({ ...payload, upload_mode: 'local_fallback' }));
        return { ok: true, mode: 'local-fallback' };
      }
      throw error;
    }
    return { ok: true, mode: 'supabase' };
  } catch (error) {
    localStorage.setItem(`swayam_answers_${student.registerNumber}`, JSON.stringify({ ...payload, upload_mode: 'local_fallback', error: error?.message || String(error) }));
    return { ok: true, mode: 'local-fallback' };
  }
}

export default function FinishPage() {
  const { state } = useExam();
  const { student } = useStudent();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Waiting for upload');
  const autoRanRef = useRef(false);

  const normalizedStudent = useMemo(() => normalizeStudent(student), [student]);
  const questions = state?.questions || [];
  const answers = state?.answers || {};

  const attemptedCount = useMemo(() => {
    return questions.filter((q) => {
      const ans = answers[q.id];
      if (!ans) return false;
      if (typeof ans === 'string') return ans.trim().length > 0;
      if (typeof ans === 'object') return Object.values(ans).some((v) => String(v || '').trim());
      return false;
    }).length;
  }, [questions, answers]);

  const handleUploadAndDownload = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setStatus('Uploading answers...');
      const uploadResult = await uploadAnswersPayload(normalizedStudent, questions, answers);
      setStatus(uploadResult.mode === 'supabase' ? 'Upload successful. Downloading PDF...' : 'Upload stored locally. Downloading PDF...');
      await generateAnswerSheet(normalizedStudent, questions, answers);
      setStatus('Done. PDF downloaded successfully.');
    } catch (err) {
      console.error('[FinishPage] upload/download failed', err);
      setStatus(`Failed: ${err?.message || 'Unable to upload answers or generate PDF'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleOnlyDownload = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setStatus('Generating PDF...');
      await generateAnswerSheet(normalizedStudent, questions, answers);
      setStatus('PDF downloaded successfully.');
    } catch (err) {
      console.error('[FinishPage] PDF generation failed', err);
      setStatus(`Failed: ${err?.message || 'Unable to generate PDF'}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoRanRef.current) return;
    autoRanRef.current = true;
    handleUploadAndDownload();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: 0, marginBottom: '10px' }}>Exam Submitted Successfully</h2>
        <p style={{ marginTop: 0, color: 'var(--ink2)' }}>
          Upload your answers, then PDF will download automatically.
        </p>

        <div style={{ border: '1px solid var(--border)', padding: '14px', borderRadius: '8px', background: '#fff' }}>
          <p style={{ margin: '6px 0' }}><strong>Roll Number:</strong> {normalizedStudent.registerNumber || '-'}</p>
          <p style={{ margin: '6px 0' }}><strong>Name:</strong> {normalizedStudent.name || '-'}</p>
          <p style={{ margin: '6px 0' }}><strong>Subject:</strong> {normalizedStudent.subject || '-'}</p>
          <p style={{ margin: '6px 0' }}><strong>Total Questions:</strong> {questions.length}</p>
          <p style={{ margin: '6px 0' }}><strong>Attempted:</strong> {attemptedCount}</p>
        </div>

        <div style={buttonRowStyle}>
          <button type="button" style={buttonStyle} onClick={handleUploadAndDownload} disabled={busy}>
            {busy ? 'Please wait...' : 'Upload Answers and Download PDF'}
          </button>
          <button type="button" style={ghostButtonStyle} onClick={handleOnlyDownload} disabled={busy}>
            Download PDF Only
          </button>
        </div>

        <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '14px' }}>
          <strong>Status:</strong> {status}
        </p>
      </div>
    </div>
  );
}