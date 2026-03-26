import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { COMMANDS } from '../constants/commands';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

export default function InstructionsPage() {
  const { student } = useStudent();
  const navigate = useNavigate();
  
  const [verifiedChecks, setVerifiedChecks] = useState({
    answer: false, command: false, emergency: false, subject: false
  });

  const needsSubjectCheck = student.subjectMode === 'maths' || student.subjectMode === 'chemistry';
  const totalChecks = needsSubjectCheck ? 4 : 3;
  const verifiedCount = Object.values(verifiedChecks).filter(Boolean).length;

  const handleVerify = (key) => setVerifiedChecks(prev => ({ ...prev, [key]: true }));
  const handleStart = () => navigate('/exam');

  const headerStyle = {
    height: '52px', backgroundColor: '#1a3a5c', color: 'white', display: 'flex', alignItems: 'center', 
    padding: '0 24px', fontSize: '14px', fontWeight: 'bold'
  };

  const tableHeaderStyle = {
    backgroundColor: '#F7F7F7', border: '1px solid #CCC', padding: '12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'left'
  };

  const tableCellStyle = {
    border: '1px solid #CCC', padding: '12px', fontSize: '14px', lineHeight: 1.6
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F0F0F0', display: 'flex', flexDirection: 'column' }}>
      <div style={headerStyle}>
         Swayam Lekh — Voice Instruction & Verification
         <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
           <span style={{ opacity: 0.8 }}>Roll No: {student.registerNo}</span>
           <span style={{ fontSize: '12px', borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '12px' }}>{student.name}</span>
         </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '32px auto', width: '100%', backgroundColor: 'white', border: '1px solid #CCC', padding: '48px', flex: 1 }}>
         <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', borderBottom: '2px solid #1a5276', paddingBottom: '12px' }}>
           Instructions to candidates for Voice-Scribe mode
         </h1>

         <p style={{ marginBottom: '24px', fontWeight: 'bold', fontSize: '13px', color: '#666' }}>
           PLEASE READ EACH SECTION CAREFULLY AND VERIFY TO PROCEED.
         </p>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
           {/* Section 1 */}
           <div style={{ border: '1px solid #CCC', overflow: 'hidden' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr><th style={tableHeaderStyle}>1.0 ANSWER MODE INSTRUCTIONS</th></tr>
               </thead>
               <tbody>
                 <tr>
                   <td style={tableCellStyle}>
                     Speak your answer naturally at a steady pace. Use the following voice commands to control the answer box behavior.
                     <div style={{ marginTop: '16px', backgroundColor: '#F9F9F9', padding: '16px', border: '1px solid #EEE' }}>
                        {COMMANDS.filter(c => c.category === 'ANSWER_MODE').map(c => (
                          <div key={c.command} style={{ display: 'flex', marginBottom: '8px' }}>
                            <code style={{ width: '200px', fontFamily: 'monospace', fontWeight: 'bold', color: '#C0392B' }}>"{c.command}"</code>
                            <span style={{ flex: 1, fontSize: '13px' }}>{c.description}</span>
                          </div>
                        ))}
                     </div>
                     <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                       <Button size="sm" variant={verifiedChecks.answer ? 'success' : 'primary'} onClick={() => handleVerify('answer')} disabled={verifiedChecks.answer}>
                         {verifiedChecks.answer ? 'Section Verified' : 'Click to Verify Section 1'}
                       </Button>
                     </div>
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>

           {/* Section 2 */}
           <div style={{ border: '1px solid #CCC', overflow: 'hidden' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr><th style={tableHeaderStyle}>2.0 COMMAND MODE INSTRUCTIONS</th></tr>
               </thead>
               <tbody>
                 <tr>
                   <td style={tableCellStyle}>
                     Used for navigation and system control without modifying the answer text.
                     <div style={{ marginTop: '16px', backgroundColor: '#F9F9F9', padding: '16px', border: '1px solid #EEE' }}>
                        {COMMANDS.filter(c => c.category === 'COMMAND_MODE').map(c => (
                          <div key={c.command} style={{ display: 'flex', marginBottom: '8px' }}>
                            <code style={{ width: '200px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1a5276' }}>"{c.command}"</code>
                            <span style={{ flex: 1, fontSize: '13px' }}>{c.description}</span>
                          </div>
                        ))}
                     </div>
                     <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                       <Button size="sm" variant={verifiedChecks.command ? 'success' : 'primary'} onClick={() => handleVerify('command')} disabled={verifiedChecks.command}>
                         {verifiedChecks.command ? 'Section Verified' : 'Click to Verify Section 2'}
                       </Button>
                     </div>
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>

           {/* Section 3 Subject */}
           {needsSubjectCheck && (
             <div style={{ border: '1px solid #CCC', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th style={tableHeaderStyle}>3.0 {student.subjectMode.toUpperCase()} SPECIFIC SYMBOLS</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={tableCellStyle}>
                       Instructions for special mathematical/chemical parsing.
                       <div style={{ marginTop: '8px' }}>
                         {student.subjectMode === 'maths' 
                            ? "Equations are parsed via LaTeX. Natural terms like 'alpha', 'beta', 'integral' are supported." 
                            : "Subscript and Superscript indices are automatically handled."}
                       </div>
                       <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                         <Button size="sm" variant={verifiedChecks.subject ? 'success' : 'primary'} onClick={() => handleVerify('subject')} disabled={verifiedChecks.subject}>
                           {verifiedChecks.subject ? 'Section Verified' : 'Click to Verify Section 3'}
                         </Button>
                       </div>
                    </td>
                  </tr>
                </tbody>
              </table>
             </div>
           )}

           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', borderTop: '1px solid #CCC', paddingTop: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                 Verified {verifiedCount} of {totalChecks} Sections
              </div>
              <Button size="lg" disabled={verifiedCount < totalChecks} onClick={handleStart}>
                All Sections Verified — PROCEED TO EXAM
              </Button>
           </div>
         </div>
      </div>
    </div>
  );
}