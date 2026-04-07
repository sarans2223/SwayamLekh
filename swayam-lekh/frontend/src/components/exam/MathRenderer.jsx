import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Volume2, Trash2 } from 'lucide-react';
import { playSarvamTTS } from '../../utils/sarvamTTS';

export default function MathRenderer({ latex, onClear }) {
  // Memoize the rendered HTML to avoid recomputation
  const renderedHtml = useMemo(() => {
    if (!latex) return null;

    try {
      const html = katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      });
      return html;
    } catch (err) {
      console.error('KaTeX render error:', err);
      return null;
    }
  }, [latex]);

  const handleReadMath = async () => {
    if (!latex) return;

    // Convert LaTeX to plain English description for TTS
    // This is a simple conversion; you can enhance it further
    const englishDescription = latexToEnglish(latex);
    
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

  if (!latex) {
    return (
      <div
        style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: '#f5f5f5',
          border: '2px dashed #ccc',
          color: '#666',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        📝 Speak your equation...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Rendered Math */}
      {renderedHtml ? (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fff',
            borderRadius: '6px',
            marginBottom: '12px',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fff',
            borderRadius: '6px',
            marginBottom: '12px',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px',
          }}
        >
          (Could not render equation)
        </div>
      )}

      {/* Raw LaTeX */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontFamily: 'Monaco, monospace',
          fontSize: '12px',
          color: '#666',
          marginBottom: '12px',
          wordBreak: 'break-all',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontWeight: '500', color: '#555' }}>LaTeX:</span> {latex}
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={handleReadMath}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #2196F3',
            backgroundColor: '#fff',
            color: '#2196F3',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.backgroundColor = '#e3f2fd';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.backgroundColor = '#fff';
          }}
        >
          <Volume2 size={16} />
          READ MATH
        </button>

        <button
          onClick={handleClear}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #f44336',
            backgroundColor: '#fff',
            color: '#f44336',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.backgroundColor = '#ffebee';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.backgroundColor = '#fff';
          }}
        >
          <Trash2 size={16} />
          CLEAR MATH
        </button>
      </div>
    </div>
  );
}

/**
 * Simple converter from LaTeX to plain English description for TTS
 * Can be enhanced further based on patterns
 */
function latexToEnglish(latex) {
  if (!latex) return '';

  let text = latex;

  // Remove LaTeX commands and convert to readable English
  text = text
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1) over ($2)')
    .replace(/\^(\{[^}]*\}|\S)/g, 'to the power $1')
    .replace(/\^\{([^}]*)\}/g, 'to the power $1')
    .replace(/_\{([^}]*)\}/g, 'subscript $1')
    .replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g, '$1 root of $2')
    .replace(/\\sqrt\{([^}]*)\}/g, 'square root of $1')
    .replace(/\\sin/g, 'sine')
    .replace(/\\cos/g, 'cosine')
    .replace(/\\tan/g, 'tangent')
    .replace(/\\int/g, 'integral')
    .replace(/\\sum/g, 'sum')
    .replace(/\\prod/g, 'product')
    .replace(/\\lim/g, 'limit')
    .replace(/\\infty/g, 'infinity')
    .replace(/\\pi/g, 'pi')
    .replace(/\\alpha/g, 'alpha')
    .replace(/\\beta/g, 'beta')
    .replace(/\\theta/g, 'theta')
    .replace(/\\to/g, 'to')
    .replace(/\\times/g, 'times')
    .replace(/\\div/g, 'divided by')
    .replace(/\\neq/g, 'not equal to')
    .replace(/\\leq/g, 'less than or equal to')
    .replace(/\\geq/g, 'greater than or equal to')
    .replace(/\\\\/g, ' ')
    .replace(/[{}\\]/g, '');

  return text || latex;
}
