import React, { useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useWebcam } from '../../hooks/useWebcam';
import Button from '../ui/Button';

export default function WebcamCapture({ onDone }) {
  const { photo, cameraActive, videoRef, startCamera, capturePhoto } = useWebcam();

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
  }, []);

  const handleCapture = () => {
    const dataUrl = capturePhoto();
    // capturePhoto returns the dataUrl and sets photo state
  };

  const handleRetake = () => {
    startCamera();
  };

  const handleConfirm = () => {
    if (onDone) onDone(photo);
  };

  const containerStyle = {
    width: '100%', aspectRatio: '4/3',
    backgroundColor: '#000',
    borderRadius: 'var(--radius-sm)',
    position: 'relative', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', border: '2px dashed var(--border)', marginBottom: '16px',
  };

  return (
    <div>
      <div style={{ marginBottom: '8px', fontWeight: 500, fontSize: '13px', textTransform: 'uppercase', color: 'var(--ink2)' }}>
        Live Photo Verification
      </div>

      <div style={containerStyle}>
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', display: cameraActive && !photo ? 'block' : 'none',
          }}
        />

        {/* Captured photo preview */}
        {photo && photo !== 'mock_photo' && (
          <img
            src={photo}
            alt="Captured"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {photo === 'mock_photo' && (
          <div style={{ color: 'white', textAlign: 'center' }}>
            <CheckCircle2 size={40} color="var(--green)" />
            <p style={{ marginTop: '8px' }}>[Photo Captured]</p>
          </div>
        )}

        {/* Corner brackets for live feed */}
        {cameraActive && !photo && (
          <>
            <div style={{ position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderTop: '3px solid white', borderLeft: '3px solid white' }} />
            <div style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderTop: '3px solid white', borderRight: '3px solid white' }} />
            <div style={{ position: 'absolute', bottom: 12, left: 12, width: 28, height: 28, borderBottom: '3px solid white', borderLeft: '3px solid white' }} />
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 28, height: 28, borderBottom: '3px solid white', borderRight: '3px solid white' }} />
          </>
        )}

        {/* Idle state */}
        {!cameraActive && !photo && (
          <div style={{ textAlign: 'center', color: 'var(--ink2)' }}>
            <Camera size={48} style={{ opacity: 0.4, marginBottom: '8px' }} />
            <p style={{ fontSize: '13px' }}>Starting camera…</p>
          </div>
        )}

        {/* Checkmark overlay on photo */}
        {photo && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'white', borderRadius: '50%' }}>
            <CheckCircle2 size={28} color="var(--green)" />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {cameraActive && !photo && (
          <Button onClick={handleCapture} variant="primary" fullWidth icon={<Camera size={18} />}>
            Capture Photo
          </Button>
        )}
        {photo && (
          <>
            <Button onClick={handleRetake} variant="outline" icon={<RefreshCw size={18} />}>
              Retake
            </Button>
            <Button onClick={handleConfirm} variant="success" fullWidth>
              Use This Photo →
            </Button>
          </>
        )}
      </div>
    </div>
  );
}