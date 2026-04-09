import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useWhisper - uses the browser's native SpeechRecognition API for live
 * voice-to-text transcription. Works in Chrome/Edge.
 * Falls back to a silent no-op if SpeechRecognition is not supported.
 */
export function useWhisper({ lang = 'en-IN', onTranscript, onCommand, continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  const onCommandRef = useRef(onCommand);
  const LOG_DETECTED_SPEECH = true;
  const lastFinalRef = useRef('');
  const lastFinalTsRef = useRef(0);
  const retryCountRef = useRef(0);
  const restartTimerRef = useRef(null);
  const userStoppedRef = useRef(false);

  const normalizeTranscript = (txt = '') => {
    return (txt || '')
      .replace(/\s+/g, ' ')
      .replace(/^[:\-\s]+|[:\-\s]+$/g, '')
      .trim();
  };

  const isMeaningful = (txt = '') => {
    const t = normalizeTranscript(txt);
    if (!t) return false;
    if (t.length < 2) return false;
    return /[\p{L}\p{N}]/u.test(t); // has letter or number
  };

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }
    if (recognitionRef.current) return; // Already running

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onstart = () => {
      userStoppedRef.current = false;
      retryCountRef.current = 0;
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      // If continuous mode and user didn't explicitly stop, attempt a gentle restart
      if (continuous && !userStoppedRef.current) {
        const retry = Math.min(3, Math.max(0, retryCountRef.current || 0));
        const backoff = Math.pow(2, retry) * 500; // 500ms, 1000ms, 2000ms
        restartTimerRef.current = setTimeout(() => {
          retryCountRef.current = (retryCountRef.current || 0) + 1;
          try {
            // Only restart if no recognizer currently running
            if (!recognitionRef.current) start();
          } catch (_) { /* ignore restart error */ }
        }, backoff);
      }
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

      // Only announce final transcripts in the exam voice format to avoid duplicates
      if (finalText) {
        const cleaned = normalizeTranscript(finalText);

        // Debounce duplicates that happen immediately after one another
        const now = Date.now();
        if (isMeaningful(cleaned)) {
          if (cleaned !== lastFinalRef.current || (now - lastFinalTsRef.current) > 1200) {
            lastFinalRef.current = cleaned;
            lastFinalTsRef.current = now;
            if (LOG_DETECTED_SPEECH) console.log('[[examvoice]]: heared :', cleaned);
            if (onTranscriptRef.current) onTranscriptRef.current(cleaned);
          } else {
            // duplicate final within short window — ignore
          }
        }
      } else if (interimText) {
        const c = normalizeTranscript(interimText);
        
        // Fast-path wake word trigger to instantly open helper modal while user is talking natively
        const fastTriggers = new Set(['help', 'halp', 'elp', 'help help', 'help help help', 'stop', 'quit', 'list commands']);
        if (fastTriggers.has(c)) {
          if (onCommandRef.current) onCommandRef.current(c);
        }

        // Keep interim logging as debug only (not the examvoice line)
        if (LOG_DETECTED_SPEECH) {
          if (isMeaningful(c)) console.debug('[useWhisper] interim:', c);
        }
        // do not call onCommand for standard interim text to avoid duplicate handling
      }
    };

    recognition.onerror = (event) => {
      // Ignore 'aborted' which occurs when we intentionally stop recognition
      if (event.error === 'aborted') {
        if (LOG_DETECTED_SPEECH) console.debug('[useWhisper] SpeechRecognition aborted (ignored)');
        recognitionRef.current = null;
        setListening(false);
        return;
      }

      // Suppress noisy 'no-speech' errors; log others based on debug flag
      if (event.error === 'no-speech') {
        if (LOG_DETECTED_SPEECH) console.debug('[useWhisper] SpeechRecognition no-speech (ignored)');
      } else if (event.error === 'network') {
        // Transient network error from the speech service — quiet debug log and allow restart
        if (LOG_DETECTED_SPEECH) console.debug('[useWhisper] SpeechRecognition network error (will retry):', event.error);
      } else if (event.error === 'service-not-allowed') {
        // Permissions/service critical: warn the user
        console.warn('[useWhisper] SpeechRecognition warning:', event.error);
      } else {
        if (LOG_DETECTED_SPEECH) console.error('[useWhisper] SpeechRecognition error:', event.error);
      }

      setListening(false);
      recognitionRef.current = null;

      // On transient errors, attempt restart if continuous and user didn't stop
      if (continuous && !userStoppedRef.current) {
        const retry = Math.min(3, (retryCountRef.current || 0));
        const backoff = Math.pow(2, retry) * 500;
        restartTimerRef.current = setTimeout(() => {
          retryCountRef.current = (retryCountRef.current || 0) + 1;
          try { if (!recognitionRef.current) start(); } catch (_) { }
        }, backoff);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, continuous, lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Mark that the user requested stop so auto-restarts don't occur
    userStoppedRef.current = true;
    setListening(false);
    retryCountRef.current = 0;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  return { listening, transcript, start, stop, supported: !!SpeechRecognition };
}