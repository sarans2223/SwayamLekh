import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
// Import BOTH functions: the local regex and the AI-powered converter
import { convertMath, convertSpokenMathToLatex } from '../../utils/mathConverter';

const MathScribeRenderer = ({ spokenText, currentMath = null }) => {
  const [latex, setLatex] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processSpeech = async () => {
      if (!spokenText) return;

      // 1. Instant Preview: Use Regex first so the user sees something immediately
      const quickPreview = convertSpokenMathToLatex(spokenText);
      setLatex(quickPreview);

      // 2. High-Precision: Call the AI (Groq/Llama) for the "final" chemical/math version
      setIsProcessing(true);
      try {
        const finalLatex = await convertMath(spokenText, currentMath);
        setLatex(finalLatex);
      } catch (err) {
        console.error("AI Conversion failed:", err);
      } finally {
        setIsProcessing(false);
      }
    };

    processSpeech();
  }, [spokenText, currentMath]);

  if (!spokenText) return <p style={{ color: 'var(--ink3)', fontStyle: 'italic' }}>Start speaking to see math or chemistry...</p>;

  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      background: 'var(--surface2)',
      marginTop: '16px',
      boxShadow: 'var(--shadow-sm)',
      position: 'relative'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: 'var(--ink2)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Output {isProcessing && <span style={{ marginLeft: '10px', fontSize: '10px', color: 'var(--primary)' }}>(Refining...)</span>}
      </h4>

      <div style={{ fontSize: '1.8rem', color: 'var(--ink)', display: 'flex', justifyContent: 'center', minHeight: '60px' }}>
        <BlockMath math={latex || ''} />
      </div>

      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <small style={{ color: 'var(--ink3)', fontSize: '12px' }}>
          <strong>LaTeX:</strong> <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px' }}>{latex}</code>
        </small>
      </div>
    </div>
  );
};

export default MathScribeRenderer;