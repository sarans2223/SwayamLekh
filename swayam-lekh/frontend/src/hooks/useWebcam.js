import { useState } from 'react';

// Empty shell for Webcam capture
export function useWebcam() {
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  const startCamera = async () => {
    console.log("Mock start camera");
    setCameraActive(true);
  };

  const stopCamera = () => {
    console.log("Mock stop camera");
    setCameraActive(false);
  };

  const capturePhoto = () => {
    console.log("Mock capture photo");
    setPhoto("mock_photo_data_url");
  };

  return { stream, photo, cameraActive, startCamera, stopCamera, capturePhoto };
}