/**
 * Groq Whisper STT client for browser microphone input.
 * The browser captures audio, then sends multipart/form-data to the backend.
 * The backend calls Groq's Whisper endpoint using the Groq API key.
 */

const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const BACKEND_STT_URL = `${BACKEND_BASE_URL}/api/stt`;

/**
 * Transcribe a microphone audio blob using Sarvam STT via Backend Proxy.
 *
 * @param {Blob} audioBlob - WebM/WAV audio blob from MediaRecorder
 * @param {string} languageCode - Language hint such as 'ta-IN' or 'hi-IN'
 * @returns {Promise<string>} transcript text
 */
export async function sarvamTranscribe(audioBlob, languageCode = 'hi-IN') {
  if (!audioBlob || !audioBlob.size) return '';

  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  
  // Use correct Sarvam field names
  formData.append('language_code', languageCode);
  formData.append('model', 'saarika:v2.5');

  const response = await fetch(BACKEND_STT_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Sarvam Whisper backend error (${response.status}): ${body}`);
  }

  const data = await response.json();
  return (data?.transcript || data?.text || '').trim();
}
