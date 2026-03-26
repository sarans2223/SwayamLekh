import React, { useRef, useEffect, useState } from 'react';

export default function RegistrationInput({ value = [], onChange, onComplete }) {
  const [readingBack, setReadingBack] = useState(false);
  const inputsRef = useRef([]);

  const handleChange = (e, idx) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) return;

    const newArr = [...value];
    newArr[idx] = val;
    onChange(newArr);

    if (val && idx < 7) {
      inputsRef.current[idx + 1].focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputsRef.current[idx - 1].focus();
    }
  };

  const isComplete = value.length === 8 && value.every(v => v);

  useEffect(() => {
    if (isComplete) {
      setReadingBack(true);
      const t = setTimeout(() => {
        setReadingBack(false);
        if (onComplete) onComplete();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isComplete]);

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px', /* JEE STRICT */
    flexWrap: 'wrap'
  };

  const getInputStyle = (idx) => ({
    width: '36px', /* JEE STRICT */
    height: '42px', /* JEE STRICT */
    fontSize: '18px',
    textAlign: 'center',
    fontWeight: 'bold',
    border: `1px solid ${value[idx] ? 'var(--green)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)', /* Sharp corners */
    backgroundColor: value[idx] ? '#f0fff0' : 'var(--surface)',
    color: 'var(--ink)',
    outline: 'none',
    transition: 'all 0.1s'
  });

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: 'var(--ink2)' }}>
        8-Digit Hall Ticket / Registration No.
        {readingBack && <span style={{ marginLeft: '12px', color: 'var(--accent)', fontWeight: 'normal' }}>Verifying...</span>}
      </div>
      <div style={containerStyle}>
        {Array.from({ length: 8 }).map((_, i) => (
          <input
            key={i}
            ref={el => inputsRef.current[i] = el}
            value={value[i] || ''}
            onChange={e => handleChange(e, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            maxLength={1}
            style={getInputStyle(i)}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = value[i] ? 'var(--green)' : 'var(--border)'}
          />
        ))}
      </div>
    </div>
  );
}