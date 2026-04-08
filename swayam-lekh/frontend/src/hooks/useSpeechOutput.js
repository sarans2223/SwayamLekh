// Empty shell for Speech Output (Sarvam API)
export function useSpeechOutput() {
  /**
   * @type {boolean}
   */
  const speaking = false;

  /**
   * Speaks the given text using Sarvam Bulbul TTS
   * @param {string} text - text to speak
   * @param {function} onEnd - callback when speech ends
   */
  const speak = (text, onEnd) => {
    if (import.meta.env.DEV) console.log("Mock speaking: ", text);
    if (onEnd) setTimeout(onEnd, 1000);
  };

  const stop = () => {
    if (import.meta.env.DEV) console.log("Mock stop speech");
  };

  return { speaking, speak, stop };
}