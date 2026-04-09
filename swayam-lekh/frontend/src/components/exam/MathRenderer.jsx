import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Volume2, Trash2 } from 'lucide-react';
import { playSarvamTTS } from '../../utils/sarvamTTS';

export default function MathRenderer({
  latex,
  onClear,
  inline = false,
  className = '',
  style = {}
}) {
  // Memoize the rendered HTML to avoid recomputation
  const renderedHtml = useMemo(() => {
    if (!latex || !latex.trim()) return null;

    // Strip surrounding $ or $$ if present
    const cleanLatex = latex.trim().replace(/^(\$\$?)/, '').replace(/(\$\$?)$/, '');

    try {
      const html = katex.renderToString(cleanLatex, {
        displayMode: !inline,
        throwOnError: false,
        output: 'html',
        strict: false,
        trust: true,
      });
      return html;
    } catch (err) {
      console.error('KaTeX render error:', err);
      return null;
    }
  }, [latex, inline]);

  const handleReadMath = async () => {
    if (!latex) return;

    // Strip surrounding $ or $$ if present for TTS
    const cleanLatex = latex.trim().replace(/^(\$\$?)/, '').replace(/(\$\$?)$/, '');
    
    // Convert LaTeX to plain English description for TTS
    const englishDescription = latexToEnglish(cleanLatex);

    try {
      await playSarvamTTS(englishDescription, 'en-IN');
    } catch (err) {
      console.error('Error playing math audio:', err);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  if (!latex || !renderedHtml) {
    return (
      <div
        className={`math-renderer-empty ${className}`}
        style={{
          padding: '20px',
          borderRadius: '8px',
          border: '2px dashed var(--border)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          ...style,
        }}
      >
        No math expression to display
      </div>
    );
  }

  const containerStyle = {
    position: 'relative',
    padding: inline ? '4px 8px' : '16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--background)',
    margin: inline ? '0' : '8px 0',
    overflowX: 'auto',
    textAlign: inline ? 'inherit' : 'center',
    ...style,
  };

  const mathStyle = {
    fontSize: inline ? '1em' : '1.2em',
    lineHeight: inline ? '1.2' : '1.5',
  };

  return (
    <div className={`math-renderer ${className}`} style={containerStyle}>
      {/* Control buttons */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          opacity: 0.7,
        }}
      >
        <button
          onClick={handleReadMath}
          style={{
            padding: '4px',
            border: 'none',
            borderRadius: '4px',
            background: 'var(--primary)',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title="Read math aloud"
        >
          <Volume2 size={14} />
        </button>
        {onClear && (
          <button
            onClick={handleClear}
            style={{
              padding: '4px',
              border: 'none',
              borderRadius: '4px',
              background: 'var(--red)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
            title="Clear expression"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Rendered math */}
      <div
        style={mathStyle}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
}

// Simple LaTeX to English converter for TTS
function latexToEnglish(latex) {
  if (!latex) return '';

  let text = latex;

  // Basic conversions for common symbols
  const conversions = [
    { pattern: /\\alpha/g, replacement: 'alpha' },
    { pattern: /\\beta/g, replacement: 'beta' },
    { pattern: /\\gamma/g, replacement: 'gamma' },
    { pattern: /\\delta/g, replacement: 'delta' },
    { pattern: /\\theta/g, replacement: 'theta' },
    { pattern: /\\lambda/g, replacement: 'lambda' },
    { pattern: /\\pi/g, replacement: 'pi' },
    { pattern: /\\sigma/g, replacement: 'sigma' },
    { pattern: /\\times/g, replacement: 'times' },
    { pattern: /\\div/g, replacement: 'divided by' },
    { pattern: /\\frac\{([^}]+)\}\{([^}]+)\}/g, replacement: '$1 over $2' },
    { pattern: /\\sqrt\{([^}]+)\}/g, replacement: 'square root of $1' },
    { pattern: /\\int\s+(.+?)\s+\\,\s+d(\w+)/g, replacement: 'integral of $1 with respect to $2' },
    { pattern: /\^\{([^}]+)\}/g, replacement: ' to the power $1' },
    { pattern: /\^(\d+)/g, replacement: ' to the power $1' },
    { pattern: /\{([^}]+)\}/g, replacement: '$1' },
    { pattern: /\\,/g, replacement: ' ' },
  ];

  conversions.forEach(({ pattern, replacement }) => {
    text = text.replace(pattern, replacement);
  });

  // Clean up extra spaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
