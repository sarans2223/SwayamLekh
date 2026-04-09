import React, { useState, useEffect, useCallback } from 'react';
import AnswerSheet from '../components/exam/AnswerSheet';
import MathRenderer from '../components/exam/MathRenderer';
import { convertToLatex, testConversions } from '../utils/speechToLatex';
import { detectVoiceCommand } from '../utils/commandMatcher';

export default function MathScribeDemo() {
  const [expressions, setExpressions] = useState([]);
  const [currentPreview, setCurrentPreview] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Voice command patterns for math scribe
  const VOICE_COMMANDS = {
    'next line': 'next_line',
    'new line': 'next_line',
    'next equation': 'next_line',
    'delete': 'delete_last',
    'delete last': 'delete_last',
    'clear': 'clear_all',
    'clear all': 'clear_all',
    'export': 'export',
    'save': 'export',
    'read': 'read_aloud',
    'read aloud': 'read_aloud',
    'preview': 'preview',
    'show preview': 'preview',
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
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

        const fullTranscript = (finalTranscript || interimTranscript).trim();

        if (event.results[event.resultIndex].isFinal && finalTranscript.trim()) {
          handleVoiceInput(finalTranscript.trim());
        } else if (interimTranscript.trim()) {
          // For interim result, just show the raw text as a "pre-preview"
          setCurrentPreview(`(processing: ${interimTranscript.trim()})`);
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const handleVoiceInput = useCallback(async (transcript) => {
    const normalized = transcript.toLowerCase().trim();

    // Check for voice commands first
    const command = detectVoiceCommand(normalized, VOICE_COMMANDS);
    if (command) {
      executeVoiceCommand(command);
      return;
    }

    // If not a command, treat as math expression
    setIsConverting(true);
    try {
      // Use the backend-backed converter
      const latex = await convertToLatex(transcript);
      setCurrentPreview(latex);
    } catch (err) {
      console.error('Conversion failed:', err);
    } finally {
      setIsConverting(false);
    }
  }, []);

  const executeVoiceCommand = (command) => {
    switch (command) {
      case 'next_line':
        if (currentPreview) {
          addExpression(currentPreview, `Converted from voice: "${currentPreview}"`);
          setCurrentPreview('');
        }
        break;
      case 'delete_last':
        if (expressions.length > 0) {
          setExpressions(prev => prev.slice(0, -1));
        }
        break;
      case 'clear_all':
        setExpressions([]);
        setCurrentPreview('');
        break;
      case 'export':
        handleExport();
        break;
      case 'read_aloud':
        // Read the last expression aloud
        if (expressions.length > 0) {
          const lastExpr = expressions[expressions.length - 1];
          // This would trigger TTS reading of the math
          console.log('Reading aloud:', lastExpr.speech);
        }
        break;
      case 'preview':
        // Show current preview
        if (currentPreview) {
          console.log('Current preview:', currentPreview);
        }
        break;
    }
  };

  const addExpression = (latex, speech = '') => {
    const newExpression = {
      id: Date.now(),
      speech: speech || `LaTeX: ${latex}`,
      latex: latex,
      timestamp: new Date().toISOString()
    };
    setExpressions(prev => [...prev, newExpression]);
  };

  const updateExpression = (id, updates) => {
    setExpressions(prev =>
      prev.map(expr => expr.id === id ? { ...expr, ...updates } : expr)
    );
  };

  const deleteExpression = (id) => {
    setExpressions(prev => prev.filter(expr => expr.id !== id));
  };

  const clearAll = () => {
    setExpressions([]);
    setCurrentPreview('');
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

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  // Test the conversion function on component mount
  useEffect(() => {
    testConversions();
  }, []);

  const demoExpressions = [
    {
      id: 1,
      speech: "a square plus b square",
      latex: "a^{2} + b^{2}",
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      speech: "x plus 1 whole square",
      latex: "(x + 1)^{2}",
      timestamp: new Date().toISOString()
    },
    {
      id: 3,
      speech: "square root of x plus y",
      latex: "\\sqrt{x + y}",
      timestamp: new Date().toISOString()
    }
  ];

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: 'var(--background)',
    padding: '20px',
    fontFamily: 'var(--font-sans)',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '32px',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  };

  const subtitleStyle = {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
  };

  const controlsStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  };

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--primary)',
    color: 'white',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'var(--secondary)',
    color: 'var(--text-primary)',
  };

  const previewStyle = {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: 'var(--surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
  };

  const previewTitleStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  };

  const commandsListStyle = {
    backgroundColor: 'var(--surface)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    marginBottom: '32px',
  };

  const commandsTitleStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginBottom: '12px',
  };

  const commandsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  };

  const commandItemStyle = {
    padding: '8px 12px',
    backgroundColor: 'var(--background)',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '14px',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>🎯 Math Scribe - AI Math Assistant</h1>
        <p style={subtitleStyle}>
          Speak math expressions naturally and see them beautifully formatted in real-time
        </p>
      </div>

      {/* Voice Controls */}
      <div style={controlsStyle}>
        <button
          style={{
            ...primaryButtonStyle,
            backgroundColor: isListening ? 'var(--red)' : 'var(--primary)',
          }}
          onClick={toggleListening}
        >
          {isListening ? '🎤 Stop Listening' : '🎤 Start Voice Input'}
        </button>
        <button
          style={secondaryButtonStyle}
          onClick={() => setExpressions(demoExpressions)}
        >
          📚 Load Demo
        </button>
        <button
          style={secondaryButtonStyle}
          onClick={() => testConversions()}
        >
          🧪 Test Conversions
        </button>
      </div>

      {/* Voice Commands Reference */}
      <div style={commandsListStyle}>
        <div style={commandsTitleStyle}>🎙️ Voice Commands</div>
        <div style={commandsGridStyle}>
          {Object.entries(VOICE_COMMANDS).map(([phrase, command]) => (
            <div key={phrase} style={commandItemStyle}>
              <strong>"{phrase}"</strong> → {command.replace('_', ' ')}
            </div>
          ))}
        </div>
      </div>

      {/* Current Preview */}
      {(currentPreview || isConverting) && (
        <div style={{
          ...previewStyle,
          opacity: isConverting ? 0.7 : 1,
          position: 'relative'
        }}>
          <div style={previewTitleStyle}>
            📝 Current Preview {isConverting ? '(AI Processing...)' : '(say "next line" to add)'}
          </div>
          {isConverting ? (
            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              Converting to LaTeX...
            </div>
          ) : (
            <MathRenderer latex={currentPreview} inline={false} />
          )}
        </div>
      )}

      {/* Answer Sheet */}
      <AnswerSheet
        expressions={expressions}
        onAddExpression={addExpression}
        onUpdateExpression={updateExpression}
        onDeleteExpression={deleteExpression}
        onClearAll={clearAll}
        title="📓 Your Math Answers"
      />

      {/* Examples Section */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: 'var(--surface)', borderRadius: '12px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>💡 Example Conversions</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {[
            { speech: "a square plus b square", latex: "a^{2} + b^{2}" },
            { speech: "x plus 1 whole square", latex: "(x + 1)^{2}" },
            { speech: "a plus b whole square divided by 2a", latex: "\\frac{(a + b)^{2}}{2a}" },
            { speech: "square root of x plus y", latex: "\\sqrt{x + y}" },
            { speech: "integral 5 x power 4 dx", latex: "\\int 5x^{4} \\, dx" },
          ].map((example, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px',
              backgroundColor: 'var(--background)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                "{example.speech}"
              </div>
              <div style={{ flex: 1 }}>
                <MathRenderer latex={example.latex} inline={true} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}