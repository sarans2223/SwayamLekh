import React from 'react';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useWebcam } from '../../hooks/useWebcam';
import Button from '../ui/Button';

export default function WebcamCapture({ onCapture, onRetake }) {
  const { stream, photo, cameraActive, startCamera, stopCamera, capturePhoto } = useWebcam();

  const handleCapture = () => {
    capturePhoto();
    if (onCapture) onCapture();
  };

  const handleRetake = () => {
    if (onRetake) onRetake();
    startCamera();
  };

  const containerStyle = {
    width: '100%',
    maxWidth: '400px',
    aspectRatio: '4/3',
    backgroundColor: 'var(--surface2)',
    borderRadius: 'var(--radius-sm)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px dashed var(--border)',
    marginBottom: '16px'
  };

  return (
    <div>
      <div style={{ marginBottom: '8px', fontWeight: 500 }}>Live Photo Verification</div>
      <div style={containerStyle}>
        {!photo && !cameraActive && (
          <div style={{ textAlign: 'center', color: 'var(--ink2)' }}>
            <Camera size={48} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p>Camera will appear here</p>
          </div>
        )}
        
        {!photo && cameraActive && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000' }}>
            {/* video placeholder logic */}
            <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              [Live Stream]
            </div>
            {/* Corner brackets overlay */}
            <div style={{ position: 'absolute', top: 16, left: 16, width: 32, height: 32, borderTop: '4px solid white', borderLeft: '4px solid white' }} />
            <div style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderTop: '4px solid white', borderRight: '4px solid white' }} />
            <div style={{ position: 'absolute', bottom: 16, left: 16, width: 32, height: 32, borderBottom: '4px solid white', borderLeft: '4px solid white' }} />
            <div style={{ position: 'absolute', bottom: 16, right: 16, width: 32, height: 32, borderBottom: '4px solid white', borderRight: '4px solid white' }} />
          </div>
        )}

        {photo && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
             [Captured Image Display]
             <div style={{ position: 'absolute', top: 16, right: 16, background: 'white', borderRadius: '50%' }}>
                <CheckCircle2 size={32} color="var(--green)" />
             </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {!photo && !cameraActive && (
           <Button onClick={startCamera} variant="outline" fullWidth icon={<Camera size={20} />}>
             Start Camera
           </Button>
        )}
        {!photo && cameraActive && (
           <Button onClick={handleCapture} variant="primary" fullWidth icon={<Camera size={20} />}>
             Capture Photo
           </Button>
        )}
        {photo && (
           <Button onClick={handleRetake} variant="outline" fullWidth icon={<RefreshCw size={20} />}>
             Retake Photo
           </Button>
        )}
      </div>
    </div>
  );
}