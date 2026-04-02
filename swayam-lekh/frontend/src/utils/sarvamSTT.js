/**
 * sarvamSTT.js
 * Transcribes audio blobs using Sarvam AI's speech-to-text API (saarika:v2.5).
 * Called directly from the browser — no backend proxy required.
 *
 * Supported language codes: 'en-IN', 'ta-IN', 'hi-IN', etc.
 */

const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY;
const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

/**
 * @param {Blob}   audioBlob    - WebM/WAV audio blob (≤ 30 seconds)
 * @param {string} languageCode - BCP-47 code, e.g. 'en-IN' or 'ta-IN'
 * @returns {Promise<string>}   - Transcribed text, or '' on empty/failure
 */
export async function sarvamTranscribe(audioBlob, languageCode = 'en-IN') {
  if (!audioBlob || !audioBlob.size) return '';
  if (!SARVAM_API_KEY) {
    console.error('[SarvamSTT] VITE_SARVAM_API_KEY is not set in .env');
    throw new Error('Sarvam API key missing');
  }

  const fd = new FormData();
  fd.append('file', audioBlob, 'audio.webm');
  fd.append('model', 'saarika:v2.5');
  fd.append('language_code', languageCode);

  const res = await fetch(SARVAM_STT_URL, {
    method: 'POST',
    headers: { 'api-subscription-key': SARVAM_API_KEY },
    body: fd,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sarvam STT ${res.status}: ${body}`);
  }

  const data = await res.json();
  // Sarvam returns { transcript: "..." }
  return (data.transcript || '').trim();
}
