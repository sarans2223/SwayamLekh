import React, { useState, useEffect } from 'react';
import MathRenderer from './MathRenderer';
import { convertToLatex } from '../../utils/speechToLatex';
import { Download, Plus, Mic, MicOff } from 'lucide-react';

export default function AnswerSheet({
  expressions = [],
  onAddExpression,
  onUpdateExpression,
  onDeleteExpression,
  onClearAll,
  title = "Math Answer Sheet",
  className = '',
  style = {}
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [recognition, setRecognition] = useState(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentSpeech(finalTranscript || interimTranscript);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
        if (currentSpeech.trim()) {
          const latex = convertToLatex(currentSpeech.trim());
          if (onAddExpression) {
            onAddExpression({
              id: Date.now(),
              speech: currentSpeech.trim(),
              latex: latex,
              timestamp: new Date().toISOString()
            });
          }
          setCurrentSpeech('');
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (recognition && !isRecording) {
      setIsRecording(true);
      setCurrentSpeech('');
      recognition.start();
    }
  };

  const handleStopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
    }
  };

  const handleAddManualExpression = () => {
    const speech = prompt('Enter math expression:');
    if (speech && speech.trim()) {
      const latex = convertToLatex(speech.trim());
      if (onAddExpression) {
        onAddExpression({
          id: Date.now(),
          speech: speech.trim(),
          latex: latex,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  const handleExport = () => {
    const content = expressions.map((expr, index) =>
      `${index + 1}. ${expr.speech}\n   LaTeX: ${expr.latex}\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'math_answers.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const containerStyle = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'var(--font-sans)',
    backgroundColor: 'var(--background)',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    ...style,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid var(--border)',
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    margin: 0,
  };

  const controlsStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  };

  const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  };

  const recordButtonStyle = {
    ...buttonStyle,
    backgroundColor: isRecording ? 'var(--red)' : 'var(--primary)',
    color: 'white',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--secondary)',
    color: 'var(--text-primary)',
  };

  const expressionListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  };

  const expressionItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'var(--surface)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
  };

  const expressionNumberStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--primary)',
    minWidth: '24px',
    textAlign: 'center',
  };

  const expressionContentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const speechTextStyle = {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  };

  const recordingIndicatorStyle = {
    padding: '12px',
    backgroundColor: 'var(--primary-light)',
    borderRadius: '8px',
    textAlign: 'center',
    color: 'var(--primary)',
    fontWeight: '500',
    animation: isRecording ? 'pulse 1s infinite' : 'none',
  };

  return (
    <div className={`answer-sheet ${className}`} style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>{title}</h1>
        <div style={controlsStyle}>
          <button
            style={recordButtonStyle}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={!recognition}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={handleAddManualExpression}
          >
            <Plus size={16} />
            Add Manual
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={handleExport}
            disabled={expressions.length === 0}
          >
            <Download size={16} />
            Export
          </button>
          {onClearAll && expressions.length > 0 && (
            <button
              style={{ ...secondaryButtonStyle, backgroundColor: 'var(--red)', color: 'white' }}
              onClick={onClearAll}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div style={recordingIndicatorStyle}>
          🎤 Listening... Speak your math expression clearly
          {currentSpeech && (
            <div style={{ marginTop: '8px', fontSize: '16px' }}>
              Current: "{currentSpeech}"
            </div>
          )}
        </div>
      )}

      {/* Expressions list */}
      {expressions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          No math expressions yet. Click "Start Recording" or "Add Manual" to begin.
        </div>
      ) : (
        <div style={expressionListStyle}>
          {expressions.map((expression, index) => (
            <div key={expression.id || index} style={expressionItemStyle}>
              <div style={expressionNumberStyle}>
                {index + 1}.
              </div>
              <div style={expressionContentStyle}>
                <div style={speechTextStyle}>
                  "{expression.speech}"
                </div>
                <MathRenderer
                  latex={expression.latex}
                  onClear={() => onDeleteExpression && onDeleteExpression(expression.id)}
                  inline={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}