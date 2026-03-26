// empty shell for Sarvam Service

/**
 * Transcribes audio blob using Sarvam STT
 * @param {Blob} audioBlob 
 * @returns {Promise<string>}
 */
export async function transcribeAudio(audioBlob) {
  // TODO: integrate Sarvam API key from backend
  return null;
}

/**
 * Speaks text using Sarvam Bulbul TTS
 * @param {string} text 
 * @param {string} voice 
 * @returns {Promise<any>}
 */
export async function speakText(text, voice = 'bulbul') {
  // TODO: integrate Sarvam API key from backend
  return null;
}