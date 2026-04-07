import React, { useState, useRef } from 'react';

const SAMPLE_PHRASE = '"I agree to take this exam using Swayam Lekh and all answers are my own."';

export default function VoiceSampleModal({ onDone }) {
  const [status, setStatus] = useState('idle'); // idle | recording | recorded | uploading
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBase64, setAudioBase64] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Convert blob to base64 for storing in context
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result);
          setStatus('recorded');
        };
        reader.readAsDataURL(blob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setStatus('recording');
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permission and try again.');
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const retake = () => {
    setAudioUrl(null);
    setAudioBase64(null);
    setStatus('idle');
  };

  const handleFinish = () => {
    onDone(audioBase64 || 'no-sample');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--surface)', padding: '2.5rem', borderRadius: 'var(--radius)',
        maxWidth: '460px', width: '100%', boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🎤 Voice Sample Registration</h2>
        <p style={{ color: 'var(--ink3)', fontSize: '13px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Please read the following sentence aloud clearly. This is used to register your voice baseline for the session.
        </p>

        {/* Sample Phrase */}
        <div style={{
          padding: '1rem 1.25rem', background: 'var(--accent-light)', border: '1px solid var(--accent-mid)',
          borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '15px',
          fontStyle: 'italic', color: 'var(--accent-dark)', lineHeight: 1.7,
        }}>
          {SAMPLE_PHRASE}
        </div>

        {/* Recording Status Indicator */}
        {status === 'recording' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: 'var(--red)', fontWeight: 'bold' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            Recording in progress…
          </div>
        )}
        {status === 'recorded' && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: 'var(--green)', fontWeight: 'bold', marginBottom: '8px' }}>✅ Recording complete. Preview below:</p>
            <audio controls src={audioUrl} style={{ width: '100%' }} />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '1rem', padding: '8px 12px', background: 'var(--red-light)', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          {status === 'idle' && (
            <button onClick={startRecording} style={btnStyle('var(--red)', 'white')}>
              🎙️ Start Recording
            </button>
          )}
          {status === 'recording' && (
            <button onClick={stopRecording} style={btnStyle('var(--amber)', 'white')}>
              ⏹ Stop Recording
            </button>
          )}
          {status === 'recorded' && (
            <>
              <button onClick={retake} style={btnStyle('var(--border)', 'var(--ink)')}>
                ↩ Retake
              </button>
              <button onClick={handleFinish} style={btnStyle('var(--green)', 'white')}>
                ✅ Confirm & Continue
              </button>
            </>
          )}
        </div>

        <p style={{ marginTop: '1rem', fontSize: '11px', color: 'var(--ink3)', textAlign: 'center' }}>
          Voice data is stored only for this session and not uploaded externally.
        </p>
      </div>
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    width: '100%', padding: '0.75rem', background: bg, color,
    border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold',
    fontSize: '14px', cursor: 'pointer',
  };
}
