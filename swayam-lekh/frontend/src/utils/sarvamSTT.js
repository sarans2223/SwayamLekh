/**
 * Groq Whisper STT client for browser microphone input.
 * The browser captures audio, then sends multipart/form-data to the backend.
 * The backend calls Groq's Whisper endpoint using the Groq API key.
 */

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const BACKEND_STT_URL = `${BACKEND_BASE_URL}/api/stt`;

/**
 * Transcribe a microphone audio blob using the Groq Whisper backend.
 *
 * @param {Blob} audioBlob - WebM/WAV audio blob from MediaRecorder
 * @param {string} languageCode - Language hint such as 'ta' or 'en'
 * @returns {Promise<string>} transcript text
 */
export async function sarvamTranscribe(audioBlob, languageCode = 'ta') {
  if (!audioBlob || !audioBlob.size) return '';

  // Groq Whisper only accepts base ISO 639-1 codes (e.g. 'en', 'ta') — strip region suffix
  const baseLanguage = (languageCode || 'ta').split('-')[0].toLowerCase();

  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('language', baseLanguage);
  formData.append('model', 'whisper-large-v3');

  const response = await fetch(BACKEND_STT_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Groq Whisper backend error (${response.status}): ${body}`);
  }

  const data = await response.json();
  return (data?.transcript || '').trim();
}
