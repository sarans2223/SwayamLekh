// Empty shell for Voice Profile builder
export function useVoiceProfile() {
  const recording = false;
  const voiceProfile = null;

  const startSample = () => {
    if (import.meta.env.DEV) console.log("Mock start voice sample");
  };

  const stopSample = () => {
    if (import.meta.env.DEV) console.log("Mock stop voice sample");
  };

  const verify = () => {
    if (import.meta.env.DEV) console.log("Mock verify voice profile");
    return true;
  };

  return { recording, startSample, stopSample, voiceProfile, verify };
}