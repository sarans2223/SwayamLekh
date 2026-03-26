import React, { createContext, useContext, useState } from 'react';

const VoiceContext = createContext();

export function VoiceProvider({ children }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState("");

  return (
    <VoiceContext.Provider value={{
      isListening, setIsListening,
      isSpeaking, setIsSpeaking,
      lastCommand, setLastCommand,
      transcriptBuffer, setTranscriptBuffer
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  return useContext(VoiceContext);
}