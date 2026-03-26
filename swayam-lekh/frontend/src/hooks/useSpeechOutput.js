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
    console.log("Mock speaking: ", text);
    if (onEnd) setTimeout(onEnd, 1000);
  };

  const stop = () => {
    console.log("Mock stop speech");
  };

  return { speaking, speak, stop };
}