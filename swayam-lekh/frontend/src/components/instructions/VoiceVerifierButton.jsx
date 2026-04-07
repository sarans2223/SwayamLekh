import React, { useState, useRef } from 'react';
import Button from '../ui/Button';

export default function VoiceVerifierButton({ onVerified, label = "Hold to Speak Command" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handlePointerDown = async () => {
    if (isProcessing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        setIsProcessing(true);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Close mic tracks
        stream.getTracks().forEach(t => t.stop());
        
        // Pass blob to parent
        onVerified(blob, () => {
           setIsProcessing(false);
        });
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone permission required to verify commands.");
    }
  };

  const handlePointerUp = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (isProcessing) {
    return <Button variant="secondary" size="sm" disabled>⏳ Processing Analysis...</Button>
  }

  return (
    <Button 
      variant={isRecording ? 'danger' : 'primary'} 
      size="sm"
      onPointerDown={handlePointerDown} 
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ userSelect: 'none', touchAction: 'none' }} // Prevent text selection/scrolling while holding
    >
      {isRecording ? "🔴 Recording... Release to Stop" : `🎤 ${label}`}
    </Button>
  );
}
