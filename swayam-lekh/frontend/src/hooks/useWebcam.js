import { useState, useRef, useCallback } from 'react';

export function useWebcam() {
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null); // base64 data URL
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setCameraActive(true);
      setPhoto(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) {
      // Fallback: return a placeholder if real camera not in use
      setPhoto('mock_photo');
      return 'mock_photo';
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 320;
    canvas.height = videoRef.current.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPhoto(dataUrl);
    stopCamera();
    return dataUrl;
  }, [stopCamera]);

  return { stream, photo, cameraActive, videoRef, canvasRef, startCamera, stopCamera, capturePhoto };
}