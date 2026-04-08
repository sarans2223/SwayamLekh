import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, MessageSquare, Power, UserRoundSearch } from 'lucide-react';
import Modal from '../ui/Modal';
import { askVoiceAssistant } from '../../services/voiceAssistant';
import { sarvamTranscribe } from '../../utils/sarvamSTT';
import { playSarvamTTS } from '../../utils/sarvamTTS';

export default function CommandAssistant({ isOpen, onClose, studentLang = 'en', micStream = null }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const hasGreetedRef = useRef(false);
  const currentAudioRef = useRef(null);

  const langCode = studentLang === 'ta' ? 'ta-IN' : 'en-IN';

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Assistant: Error stopping recorder', err);
      }
    }
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const handleTranscription = useCallback(async (blob) => {
    setIsProcessing(true);
    try {
      const text = await sarvamTranscribe(blob, langCode);
      if (text) {
        const upper = text.toUpperCase();
        setTranscript(text);

        // Close if "CLOSE HELP" or similar-sounding variants are heard
        const closePhrases = [
          'CLOSE HELP', 'CLOSED HELP', 'CLOTHES HELP', 'CLAUSE HELP', 'CLOSET HELP',
          'CLOSE HEALTH', 'CLOSE HELD', 'CLOSE HELL', 'CLOSE ELP',
          'END HELP', 'AND HELP', 'HAND HELP', 'EXIT HELP', 'STOP HELP',
          'CLOSE ASSISTANT', 'EXIT ASSISTANT', 'STOP ASSISTANT',
          'CLOSE IT', 'EXIT NOW', 'STOP NOW', 'STOP IT', 'ENOUGH', 'DONE',
          'CLOSE PANU', 'CLOSE PANUNGA', 'MUDI', 'MOODU', 'STOP PANU'
        ];
        
        const isCloseCommand = closePhrases.some(phrase => upper.includes(phrase)) || 
                             (upper === 'CLOSE') || (upper === 'EXIT') || (upper === 'STOP') ||
                             (upper === 'DONE') || (upper === 'FINISHED') || (upper === 'MUDI');

        if (isCloseCommand) {
          onClose();
          return;
        }

        const aiResponse = await askVoiceAssistant(text);
        setResponse(aiResponse);
        
        // Speak the response
        const audio = await playSarvamTTS(aiResponse, langCode);
        currentAudioRef.current = audio;
        
        const playNextPrompt = async () => {
          if (!isOpen) return;
          // Prompt for next question
          const nextPromptText = studentLang === 'ta' ? 'அடுத்த கேள்வியைக் கேளுங்கள்' : 'Ask the next question';
          const nextAudio = await playSarvamTTS(nextPromptText, langCode);
          currentAudioRef.current = nextAudio;
          
          if (nextAudio) {
            nextAudio.onended = () => {
              currentAudioRef.current = null;
              if (isOpen) startListening();
            };
          } else {
            // Fallback if prompt audio fails
            if (isOpen) startListening();
          }
        };

        if (audio) {
          audio.onended = playNextPrompt;
        } else {
          // Fallback if AI response audio fails
          playNextPrompt();
        }
      } else {
        // If silence, try listening again automatically
        if (isOpen) {
          setTimeout(() => {
            if (isOpen && !isListening) startListening();
          }, 500);
        }
      }
    } catch (err) {
      console.error('Assistant error:', err);
      setResponse('I had trouble understanding that. Please try again.');
      // Auto-listen fallback on error
      if (isOpen) setTimeout(startListening, 2000);
    } finally {
      setIsProcessing(false);
    }
  }, [langCode, onClose, isOpen, isListening]);

  const startListening = useCallback(async () => {
    if (isListening || !isOpen || isProcessing) return;
    
    setTranscript('');
    setResponse('');
    
    try {
      // Reuse shared stream if available
      const stream = micStream || await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          if (blob.size < 1000) {
            console.log('Assistant: Audio chunk too short, skipping transcription.');
            if (isOpen) {
              setTimeout(() => {
                if (isOpen && !isListening) startListening();
              }, 500);
            }
            return;
          }
          handleTranscription(blob);
        }
        // Only stop tracks if we opened them ourselves
        if (!micStream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setIsListening(true);

      // Listen for a chunk (4 seconds) then process
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, 4000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setResponse('Microphone access denied.');
    }
  }, [handleTranscription, isListening, isOpen, micStream, stopListening, isProcessing]);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        } catch (e) { /* ignore */ }
        currentAudioRef.current = null;
      }
      setTranscript('');
      setResponse('');
      hasGreetedRef.current = false;
    } else {
      // On Open: Greet first, then start listening
      const initAssistant = async () => {
        if (hasGreetedRef.current) return;
        hasGreetedRef.current = true;
        
        try {
          const greetingText = studentLang === 'ta' ? 'நீங்கள் இப்போது கேட்கலாம்' : 'You may ask now';
          const audio = await playSarvamTTS(greetingText, langCode);
          currentAudioRef.current = audio;

          if (audio) {
            audio.onended = () => {
              currentAudioRef.current = null;
              if (isOpen) startListening();
            };
          } else {
            startListening();
          }
        } catch (err) {
          console.error('Greeting error:', err);
          startListening();
        }
      };

      initAssistant();
    }
  }, [isOpen, studentLang, langCode, startListening, stopListening]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Voice Command Assistant"
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '280px' }}>
        <div style={{ 
          backgroundColor: 'var(--surface2)', 
          padding: '16px', 
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ink2)', fontSize: '13px' }}>
            <MessageSquare size={14} />
            <span style={{ fontWeight: 600 }}>YOU SAID:</span>
          </div>
          <p style={{ 
            fontSize: '16px', 
            fontWeight: 500, 
            color: transcript ? 'var(--ink)' : 'var(--ink3)',
            fontStyle: transcript ? 'normal' : 'italic',
            minHeight: '24px',
            margin: 0
          }}>
            {transcript || (isListening ? 'Listening...' : '')}
          </p>

          <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '13px', marginBottom: '6px' }}>
              <UserRoundSearch size={14} />
              <span style={{ fontWeight: 600 }}>ASSISTANT:</span>
            </div>
            <p style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: 'var(--primary)',
              minHeight: '28px',
              margin: 0
            }}>
              {isProcessing ? 'Thinking...' : response}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: isListening ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: isListening ? 'var(--red)' : 'var(--primary)',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isListening ? (
              <><span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--red)', animation: 'pulse 1.5s infinite' }} /> LISTENING</>
            ) : (
              'READY'
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--ink2)', fontSize: '12px' }}>
          <p style={{ margin: '0 0 4px 0' }}>Ask about commands like "How do I skip?"</p>
          <p style={{ margin: 0 }}>Say <strong>"CLOSE HELP"</strong> to exit.</p>
        </div>
      </div>
    </Modal>
  );
}
