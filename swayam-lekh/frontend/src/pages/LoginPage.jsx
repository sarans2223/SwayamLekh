// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import RegistrationInput from '../components/login/RegistrationInput';
import NameInput from '../components/login/NameInput';
import ModeSelector from '../components/login/ModeSelector';
import WebcamCapture from '../components/login/WebcamCapture';
import Button from '../components/ui/Button';
import { playSarvamTTS } from '../utils/sarvamTTS';
import { uploadPhoto } from '../services/supabaseClient';

export default function LoginPage() {
  const { student, updateStudent } = useStudent();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handlePhotoCapture = async (photoDataUrl) => {
    updateStudent({ photo: photoDataUrl });
    setUploading(true);
    try {
      await uploadPhoto(student.registerNo, student.name, photoDataUrl);
    } catch (e) {
      console.error('Photo upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = () => navigate('/instructions');

  const canProceedStep1 = student.name && student.registerNo?.length === 8 && student.hallTicket;

  const stepLabel = (s) => ['', 'Identification', 'Configuration', 'Verification'][s];

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff' }}>
      {/* Header */}
      <div style={{ height: '40px', backgroundColor: '#1a3a5c', color: 'white', display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>
        Swayam Lekh — AI Scribe System
      </div>

      {/* Content */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Student Login</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>Completed by Hall Supervisor</p>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: step >= s ? '#1a5276' : '#e0e0e0',
                    color: step >= s ? 'white' : '#888',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '14px',
                  }}>{s}</div>
                  <span style={{ fontWeight: step === s ? 'bold' : 'normal', fontSize: '13px', color: step >= s ? '#1a5276' : '#888', whiteSpace: 'nowrap' }}>
                    {stepLabel(s)}
                  </span>
                </div>
                {s < 3 && <div style={{ flex: 1, height: '1px', backgroundColor: step > s ? '#1a5276' : '#ccc', margin: '0 12px', minWidth: '32px' }} />}
              </React.Fragment>
            ))}
          </div>

          {/* STEP 1: Identification */}
          {step === 1 && (
            <div style={{ border: '1px solid #ddd', padding: '32px', borderRadius: '4px' }}>
              <RegistrationInput
                value={student.registerNo}
                onChange={(val) => updateStudent({ registerNo: val })}
                onComplete={(val) => {
                  playSarvamTTS(`Candidate, your Registration Number is ${val.split('').join(', ')}.`, 'en-IN');
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <NameInput label="Student Name" value={student.name} onChange={val => updateStudent({ name: val })} placeholder="Enter full name" />
                <NameInput label="Hall Ticket / Roll Number" value={student.hallTicket} onChange={val => updateStudent({ hallTicket: val })} placeholder="e.g. HT-2026-001" />
              </div>
            </div>
          )}

          {/* STEP 2: Configuration */}
          {step === 2 && (
            <div style={{ border: '1px solid #ddd', padding: '32px', borderRadius: '4px' }}>
              <ModeSelector
                disabilityMode={student.disabilityMode}
                onDisabilityChange={val => updateStudent({ disabilityMode: val })}
                subjectMode={student.subjectMode}
                onSubjectChange={val => updateStudent({ subjectMode: val })}
              />
            </div>
          )}

          {/* STEP 3: Photo Verification ONLY */}
          {step === 3 && (
            <div style={{ border: '1px solid #ddd', padding: '32px', borderRadius: '4px' }}>
              <p style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '6px', color: '#1a3a5c' }}>
                📸 Student Photo Verification
              </p>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '24px', lineHeight: 1.6 }}>
                Position the student clearly in front of the camera and click <strong>Capture Photo</strong>.
                This photo will be securely stored against Registration No: <strong>{student.registerNo || '—'}</strong>.
              </p>
              <WebcamCapture onDone={handlePhotoCapture} />
              {uploading && (
                <p style={{ marginTop: '12px', fontSize: '13px', color: '#1a5276', fontWeight: 'bold' }}>
                  ☁️ Uploading photo to database…
                </p>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px', borderTop: '2px solid #f0f0f0', paddingTop: '32px' }}>
            <Button variant="secondary" disabled={step === 1} onClick={handlePrev}>← Back</Button>
            {step < 3 ? (
              <Button variant="primary" onClick={handleNext} disabled={step === 1 && !canProceedStep1}>
                Next Step →
              </Button>
            ) : (
              <Button variant="success" onClick={handleComplete} disabled={!student.photo || uploading}>
                {uploading ? 'Saving…' : 'Proceed to Instructions →'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}