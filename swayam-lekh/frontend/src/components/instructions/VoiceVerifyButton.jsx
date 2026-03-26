import React, { useState } from 'react';
import { Mic, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

export default function VoiceVerifyButton({ commandToSay, isVerified, onVerified }) {
  const [recording, setRecording] = useState(false);

  const handleClick = () => {
    if (isVerified) return;
    setRecording(true);
    // Simulate voice verification
    setTimeout(() => {
      setRecording(false);
      if (onVerified) onVerified();
    }, 2000);
  };

  if (isVerified) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--green)', fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--green-light)' }}>
        <CheckCircle2 size={24} />
        Verified successfully
      </div>
    );
  }

  return (
    <Button 
      variant={recording ? "outline" : "primary"} 
      onClick={handleClick} 
      icon={recording ? <Loader2 size={20} className="spin" /> : <Mic size={20} />}
    >
      {recording ? "Listening..." : `Say "${commandToSay}" to verify`}
    </Button>
  );
}