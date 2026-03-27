import React, { useState, useEffect, useRef } from 'react';

/**
 * MalpracticeModal
 * Full-screen red alarm overlay triggered when voice mismatch is detected.
 * Can ONLY be closed by entering security code "12345".
 * Alarm sound loops until closed.
 */
export default function MalpracticeModal({ similarityScore, detectedAt, onClose }) {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');
  const alarmRef          = useRef(null);
  const inputRef          = useRef(null);

  // Start looping alarm on mount
  useEffect(() => {
    const alarm  = new Audio('/alarm.mp3');
    alarm.loop   = true;
    alarm.volume = 0.85;
    alarm.play().catch(() => {}); // some browsers block autoplay — safe to ignore
    alarmRef.current = alarm;

    // Auto-focus the code input
    setTimeout(() => inputRef.current?.focus(), 100);

    return () => {
      alarm.pause();
      alarm.currentTime = 0;
    };
  }, []);

  const handleUnlock = (e) => {
    e?.preventDefault();
    if (code === '12345') {
      // Stop alarm
      if (alarmRef.current) {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }
      onClose();
    } else {
      setError('Invalid security code. Only the supervisor can dismiss this alert.');
      setCode('');
      inputRef.current?.focus();
    }
  };

  const timestamp = detectedAt
    ? new Date(detectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={S.backdrop}>
      {/* Pulsing red glow ring */}
      <div style={S.ring} />

      <div style={S.modal}>
        {/* Warning icon */}
        <div style={S.iconWrap}>
          <span style={{ fontSize: 52 }}>🚨</span>
        </div>

        <h1 style={S.heading}>⚠️ MALPRACTICE DETECTED</h1>

        <div style={S.scoreRow}>
          <div style={S.scoreBox}>
            <div style={S.scoreLabel}>Voice Similarity</div>
            <div style={S.scoreValue}>{similarityScore ?? '--'}%</div>
          </div>
          <div style={S.scoreBox}>
            <div style={S.scoreLabel}>Threshold</div>
            <div style={{ ...S.scoreValue, color: '#fff' }}>65%</div>
          </div>
          <div style={S.scoreBox}>
            <div style={S.scoreLabel}>Detected At</div>
            <div style={{ ...S.scoreValue, fontSize: 15 }}>{timestamp}</div>
          </div>
        </div>

        <p style={S.message}>
          The voice detected does not match the registered student's voice profile.
          A malpractice event has been logged. The supervisor must enter the security code to dismiss this alert.
        </p>

        {/* Security code input */}
        <form onSubmit={handleUnlock} style={S.form}>
          <label style={S.label}>Supervisor Security Code</label>
          <input
            ref={inputRef}
            type="password"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            placeholder="• • • • •"
            maxLength={5}
            style={{
              ...S.input,
              borderColor: error ? '#ff6b6b' : 'rgba(255,255,255,0.3)',
            }}
            autoComplete="off"
          />
          {error && <p style={S.errorMsg}>{error}</p>}
          <button type="submit" style={S.unlockBtn}>
            🔓 Unlock &amp; Dismiss
          </button>
        </form>

        <p style={S.footer}>
          This dialog cannot be closed without the correct supervisor code.
        </p>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  backdrop: {
    position:        'fixed',
    inset:           0,
    zIndex:          99999,
    backgroundColor: 'rgba(180, 0, 0, 0.92)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    animation:       'malpracticePulse 1.8s ease-in-out infinite',
  },
  ring: {
    position:     'absolute',
    inset:        0,
    background:   'radial-gradient(ellipse at center, rgba(255,50,50,0.3) 0%, transparent 70%)',
    pointerEvents:'none',
  },
  modal: {
    position:        'relative',
    backgroundColor: 'rgba(30,0,0,0.95)',
    border:          '2px solid rgba(255,100,100,0.5)',
    borderRadius:    12,
    padding:         '48px 44px',
    maxWidth:        520,
    width:           '90%',
    textAlign:       'center',
    boxShadow:       '0 0 60px rgba(255,0,0,0.4)',
    color:           '#fff',
  },
  iconWrap: {
    marginBottom: 8,
  },
  heading: {
    fontSize:     26,
    fontWeight:   900,
    color:        '#ff4444',
    marginBottom: 24,
    letterSpacing: 1,
    fontFamily:   'Arial, sans-serif',
  },
  scoreRow: {
    display:         'flex',
    gap:             16,
    justifyContent:  'center',
    marginBottom:    24,
  },
  scoreBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    border:          '1px solid rgba(255,255,255,0.15)',
    borderRadius:    8,
    padding:         '12px 20px',
    flex:            1,
  },
  scoreLabel: {
    fontSize:     11,
    color:        'rgba(255,255,255,0.5)',
    marginBottom: 4,
    textTransform:'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize:   22,
    fontWeight: 'bold',
    color:      '#ff6b6b',
  },
  message: {
    fontSize:     13,
    color:        'rgba(255,255,255,0.7)',
    lineHeight:   1.6,
    marginBottom: 28,
  },
  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
    alignItems:    'center',
  },
  label: {
    fontSize:   13,
    fontWeight: 600,
    color:      'rgba(255,255,255,0.8)',
  },
  input: {
    width:        '100%',
    maxWidth:     260,
    padding:      '14px 24px',
    fontSize:     28,
    textAlign:    'center',
    letterSpacing: 12,
    borderRadius: 8,
    border:       '2px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    color:        '#fff',
    outline:      'none',
    boxSizing:    'border-box',
  },
  errorMsg: {
    color:    '#ff9999',
    fontSize: 12,
    margin:   0,
  },
  unlockBtn: {
    marginTop:       4,
    padding:         '14px 36px',
    backgroundColor: '#fff',
    color:           '#900',
    fontWeight:      'bold',
    fontSize:        15,
    border:          'none',
    borderRadius:    8,
    cursor:          'pointer',
    width:           '100%',
    maxWidth:        260,
  },
  footer: {
    marginTop: 20,
    fontSize:  11,
    color:     'rgba(255,255,255,0.35)',
  },
};
