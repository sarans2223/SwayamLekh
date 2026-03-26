import React from 'react';
import CommandCard from './CommandCard';
import VoiceVerifyButton from './VoiceVerifyButton';
import { CheckCircle2 } from 'lucide-react';

export default function InstructionSection({ 
  icon, iconVariant, title, description, commands = [], 
  verifyKey, isVerified, onVerified 
}) {
  
  const colors = {
    answer: { bg: 'var(--red-light)', text: 'var(--red)' },
    command: { bg: 'var(--accent-light)', text: 'var(--accent)' },
    emergency: { bg: 'var(--amber-light)', text: 'var(--amber)' },
    subject: { bg: 'var(--green-light)', text: 'var(--green)' }
  };
  
  const theme = colors[iconVariant] || colors.answer;

  const cardStyle = {
    backgroundColor: 'var(--surface)',
    padding: '24px',
    borderRadius: 'var(--radius)',
    border: `2px solid ${isVerified ? 'var(--green)' : 'var(--border)'}`,
    marginBottom: '24px',
    position: 'relative',
    transition: 'all 0.3s',
    boxShadow: isVerified ? '0 0 0 2px var(--green-light)' : 'var(--shadow)'
  };

  return (
    <div style={cardStyle}>
      {isVerified && (
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <CheckCircle2 size={32} color="var(--green)" />
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: theme.bg, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
          {icon}
        </div>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{title}</h2>
      </div>
      
      <p style={{ color: 'var(--ink2)', fontSize: '16px', marginBottom: '24px' }}>
        {description}
      </p>

      {commands.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {commands.map((cmd, i) => (
            <CommandCard key={i} command={cmd.cmd} description={cmd.desc} />
          ))}
        </div>
      )}

      {verifyKey && (
         <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
             <VoiceVerifyButton 
                commandToSay={verifyKey} 
                isVerified={isVerified} 
                onVerified={onVerified} 
             />
         </div>
      )}
    </div>
  );
}