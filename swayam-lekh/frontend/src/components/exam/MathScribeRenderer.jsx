import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { convertSpokenMathToLatex } from '../../utils/mathConverter';

/**
 * This single component handles the dictionary conversion 
 * AND the visual symbol rendering.
 */
const MathScribeRenderer = ({ spokenText }) => {
  const [latex, setLatex] = useState('');

  useEffect(() => {
    if (spokenText) {
      // 1. Run it through your local dictionary first
      const converted = convertSpokenMathToLatex(spokenText);
      setLatex(converted);
    }
  }, [spokenText]);

  if (!spokenText) return <p style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>Start speaking to see math...</p>;

  return (
    <div style={{ 
      padding: '24px', 
      border: '1px solid var(--border)', 
      borderRadius: '16px',
      background: 'var(--surface2)',
      marginTop: '16px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: 'var(--ink2)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Math Output:</h4>
      
      {/* THE MAGIC PART: Turns \int into ∫ */}
      <div style={{ fontSize: '1.8rem', color: 'var(--ink)', display: 'flex', justifyContent: 'center' }}>
        <BlockMath math={latex || ''} />
      </div>

      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <small style={{ color: 'var(--ink3)', fontSize: '12px' }}>
          <strong>Raw LaTeX:</strong> <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>{latex}</code>
        </small>
      </div>
    </div>
  );
};

export default MathScribeRenderer;
