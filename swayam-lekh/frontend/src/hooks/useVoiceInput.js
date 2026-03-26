// Empty shell for Voice API listener
export function useVoiceInput() {
  /**
   * @type {boolean}
   */
  const listening = false;

  /**
   * @type {string}
   */
  const transcript = "";

  const start = () => {
    console.log("Mock start VoiceInput");
  };

  const stop = () => {
    console.log("Mock stop VoiceInput");
  };

  return { listening, start, stop, transcript };
}