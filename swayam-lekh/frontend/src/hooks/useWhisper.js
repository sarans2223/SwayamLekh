// Empty shell for Whisper STT
export function useWhisper() {
  const transcribing = false;
  const transcript = "";

  const startRecording = () => {
    console.log("Mock start Whisper recording");
  };

  const stopRecording = () => {
    console.log("Mock stop Whisper recording");
  };

  return { transcribing, startRecording, stopRecording, transcript };
}