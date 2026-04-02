import { useState, useRef, useCallback } from 'react';

/**
 * useWhisper - uses the browser's native SpeechRecognition API for live
 * voice-to-text transcription. Works in Chrome/Edge.
 * Falls back to a silent no-op if SpeechRecognition is not supported.
 */
export function useWhisper({ onTranscript, onCommand, continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }
    if (recognitionRef.current) return; // Already running

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      const combined = finalText || interimText;
      setTranscript(combined);
      if (finalText && onTranscript) onTranscript(finalText.trim());
      if (onCommand) onCommand(combined.trim().toUpperCase());
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.error('SpeechRecognition error:', event.error);
      }
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [continuous, onTranscript, onCommand]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  return { listening, transcript, start, stop, supported: !!SpeechRecognition };
}