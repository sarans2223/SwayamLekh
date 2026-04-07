// Empty shell for Voice Profile builder
export function useVoiceProfile() {
  const recording = false;
  const voiceProfile = null;

  const startSample = () => {
    console.log("Mock start voice sample");
  };

  const stopSample = () => {
    console.log("Mock stop voice sample");
  };

  const verify = () => {
    console.log("Mock verify voice profile");
    return true;
  };

  return { recording, startSample, stopSample, voiceProfile, verify };
}