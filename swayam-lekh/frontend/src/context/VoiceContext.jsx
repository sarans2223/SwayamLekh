import React, { createContext, useContext, useState } from 'react';

// Modes: 'COMMAND' = navigation mode, 'ANSWER' = dictation mode
const VoiceContext = createContext();

export function VoiceProvider({ children }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mode, setMode] = useState('COMMAND'); // 'COMMAND' | 'ANSWER'
  const [lastCommand, setLastCommand] = useState(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState('');

  return (
    <VoiceContext.Provider value={{
      isListening, setIsListening,
      isSpeaking, setIsSpeaking,
      mode, setMode,
      lastCommand, setLastCommand,
      transcriptBuffer, setTranscriptBuffer,
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  return useContext(VoiceContext);
}