import React, { useRef, useState, useEffect } from 'react';

export default function RegistrationInput({ value = '', onChange, onComplete }) {
  const inputsRef = useRef([]);
  // Use local state for the exact 8 boxes to prevent jumping when characters are deleted
  const [digits, setDigits] = useState(
    Array.from({ length: 8 }, (_, i) => value[i] || '')
  );

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/[^0-9]/g, '').slice(-1);
    // Allow empty string if deleting, otherwise skip invalid
    if (!char && e.target.value !== '') return;

    const newDigits = [...digits];
    newDigits[idx] = char;
    setDigits(newDigits);

    const newVal = newDigits.join('');
    if (onChange) onChange(newVal);

    if (char && idx < 7) {
      inputsRef.current[idx + 1]?.focus();
    }

    // Trigger complete
    if (newDigits.every(d => d !== '') && onComplete && newVal.length === 8) {
      onComplete(newVal);
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      
      if (newDigits[idx]) {
        newDigits[idx] = '';
        setDigits(newDigits);
        if (onChange) onChange(newDigits.join(''));
      } else if (idx > 0) {
        newDigits[idx - 1] = '';
        setDigits(newDigits);
        if (onChange) onChange(newDigits.join(''));
        inputsRef.current[idx - 1]?.focus();
      }
    }
  };

  const getInputStyle = (idx) => {
    const char = digits[idx] || '';
    return {
      width: '38px',
      height: '44px',
      fontSize: '20px',
      textAlign: 'center',
      fontWeight: 'bold',
      border: `2px solid ${char ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      backgroundColor: char ? 'var(--green-light)' : 'var(--surface)',
      color: 'var(--ink)',
      outline: 'none',
    };
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        8-Digit Hall Ticket / Registration No.
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <input
            key={i}
            ref={el => inputsRef.current[i] = el}
            value={digits[i] || ''}
            onChange={e => handleChange(e, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            maxLength={1}
            inputMode="numeric"
            style={getInputStyle(i)}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px var(--accent-light)'; }}
            onBlur={e => {
              e.target.style.borderColor = (digits[i] || '') ? 'var(--green)' : 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        ))}
      </div>
    </div>
  );
}