import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { APP_CONFIG } from '../config/appConfig';

import RegistrationInput from '../components/login/RegistrationInput';
import NameInput from '../components/login/NameInput';
import WebcamCapture from '../components/login/WebcamCapture';
import ModeSelector from '../components/login/ModeSelector';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const { student, updateStudent } = useStudent();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  const handleComplete = () => navigate('/instructions');

  const canProceedStep1 = student.name && student.registerNo && student.registerNo.length === 8 && student.hallTicket;

  const mainPanelStyle = {
    width: '100%', 
    backgroundColor: '#FFFFFF', 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    overflowY: 'auto', 
    fontFamily: 'Arial, sans-serif'
  };

  const headerBarStyle = {
    height: '40px', 
    backgroundColor: '#1a3a5c', 
    color: 'white', 
    display: 'flex', 
    alignItems: 'center', 
    padding: '0 24px', 
    fontSize: '14px', 
    fontWeight: 'bold'
  };

  const centerContentStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
    padding: '48px 24px'
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div style={mainPanelStyle}>
        <div style={headerBarStyle}>
           Swayam Lekh — AI Scribe System
        </div>

        <div style={centerContentStyle}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Student Login</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>Completed by Hall Supervisor</p>

          <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= s ? '#1a5276' : '#eee', color: step >= s ? 'white' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                   {s}
                 </div>
                 <span style={{ fontWeight: step >= s ? 'bold' : 'normal', fontSize: '13px', color: step >= s ? '#1a5276' : '#666' }}>
                    {s === 1 ? 'Identification' : s === 2 ? 'Configuration' : 'Verification'}
                 </span>
                 {s < 3 && <div style={{ width: '40px', height: '1px', backgroundColor: '#ccc' }} />}
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: '300px' }}>
            {step === 1 && (
              <div style={{ border: '1px solid #ddd', padding: '32px', borderRadius: 'var(--radius)' }}>
                 <RegistrationInput 
                    value={student.registerNo.split('')} 
                    onChange={(arr) => updateStudent({ registerNo: arr.join('') })} 
                 />
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                   <NameInput 
                      label="Student Name"
                      value={student.name}
                      onChange={val => updateStudent({ name: val })}
                      placeholder="Enter full name"
                   />
                   <NameInput 
                      label="Hall Ticket / Roll Number"
                      value={student.hallTicket}
                      onChange={val => updateStudent({ hallTicket: val })}
                      placeholder="e.g. HT-2026-001"
                   />
                 </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ border: '1px solid #ddd', padding: '32px', borderRadius: 'var(--radius)' }}>
                 <ModeSelector 
                    disabilityMode={student.disabilityMode}
                    onDisabilityChange={val => updateStudent({ disabilityMode: val })}
                    subjectMode={student.subjectMode}
                    onSubjectChange={val => updateStudent({ subjectMode: val })}
                 />
              </div>
            )}

            {step === 3 && (
              <div style={{ border: '1px solid #ddd', padding: '32px', borderRadius: 'var(--radius)' }}>
                 <WebcamCapture 
                    onCapture={() => updateStudent({ photo: 'captured' })}
                    onRetake={() => updateStudent({ photo: null })}
                 />
                 <div style={{ padding: '24px', backgroundColor: '#F9F9F9', border: '1px solid #eee', marginTop: '24px' }}>
                   <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Voice Profile Baseline</p>
                   <Button variant="outline" size="sm">Record Sample</Button>
                 </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px', borderTop: '2px solid #f0f0f0', paddingTop: '32px' }}>
             <Button variant="secondary" disabled={step === 1} onClick={handlePrev}>Back</Button>
             {step < 3 ? (
                <Button variant="primary" onClick={handleNext} disabled={step === 1 && !canProceedStep1}>Next Step</Button>
             ) : (
                <Button variant="success" onClick={handleComplete} disabled={!student.photo}>Login & Continue</Button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}