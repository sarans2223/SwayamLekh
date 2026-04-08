import React, { useEffect } from 'react';

const MAP = {
  THUMB_RIGHT: '👉 Next Question',
  THUMB_LEFT: '👈 Previous Question',
  THUMB_UP: '🔁 Repeating Question',
  OPEN_PALM: '❌ Clear Answer',
  THUMB_DOWN: '🔁 Repeat (confirm)',
  ONE_FINGER: '✅ Option A Selected',
  TWO_FINGERS: '✅ Option B Selected',
  THREE_FINGERS: '✅ Option C Selected',
  FOUR_FINGERS: '✅ Option D Selected',
};

export default function GestureOverlay({ lastGesture }) {
  useEffect(() => {
    // Intentionally do not vocalize gesture detections. Only show visual cue.
  }, [lastGesture]);

  if (!lastGesture) return null;

  const text = MAP[lastGesture] || lastGesture;

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 9999 }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      <div style={{
        animation: 'slideUp 240ms ease-out',
        backgroundColor: 'var(--ink)',
        color: 'white',
        padding: '10px 18px',
        borderRadius: 999,
        fontSize: 15,
        boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
        pointerEvents: 'auto',
        display: 'inline-block'
      }}>
        {text}
      </div>
    </div>
  );
}
