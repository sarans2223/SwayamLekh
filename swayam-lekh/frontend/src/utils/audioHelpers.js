export function createMediaRecorder(stream, onDataAvailable) {
  // empty shell
  return null;
}

export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result.toString().split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function calculateAudioDuration(blob) {
  return new Promise((resolve) => {
    resolve(0); // placeholder
  });
}