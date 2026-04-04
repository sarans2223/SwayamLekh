/**
 * sarvamSTT.js
 * Transcribes audio blobs using Sarvam AI's speech-to-text API (saarika:v2.5).
 * Called directly from the browser — no backend proxy required.
 *
 * Supported language codes: 'en-IN', 'ta-IN', 'hi-IN', etc.
 */

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const BACKEND_STT_URL = `${(import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '') || ''}/api/stt`;

function getSarvamApiKey() {
  return import.meta.env.VITE_SARVAM_API_KEY || import.meta.env.SARVAM_API_KEY || '';
}

/**
 * @param {Blob}   audioBlob    - WebM/WAV audio blob (≤ 30 seconds)
 * @param {string} languageCode - BCP-47 code, e.g. 'en-IN' or 'ta-IN'
 * @returns {Promise<string>}   - Transcribed text, or '' on empty/failure
 */
export async function sarvamTranscribe(audioBlob, languageCode = 'en-IN') {
  if (!audioBlob || !audioBlob.size) return '';

  const proxyFd = new FormData();
  proxyFd.append('audio', audioBlob, 'audio.webm');
  proxyFd.append('model', 'saarika:v2.5');
  proxyFd.append('language_code', languageCode);

  // Prefer backend proxy so secrets stay server-side.
  try {
    const proxyRes = await fetch(BACKEND_STT_URL || '/api/stt', {
      method: 'POST',
      body: proxyFd,
    });

    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      return (proxyData?.transcript || '').trim();
    }

    const proxyErrBody = await proxyRes.text().catch(() => '');
    console.warn(`[SarvamSTT] Backend proxy failed (${proxyRes.status}). Falling back to direct API.`, proxyErrBody);
  } catch (proxyErr) {
    console.warn('[SarvamSTT] Backend proxy unavailable. Falling back to direct API.', proxyErr?.message || proxyErr);
  }

  const apiKey = getSarvamApiKey();
  if (!apiKey) {
    console.error('[SarvamSTT] Missing API key. Set backend SARVAM_API_KEY or frontend VITE_SARVAM_API_KEY.');
    throw new Error('Sarvam API key missing');
  }

  const directFd = new FormData();
  directFd.append('file', audioBlob, 'audio.webm');
  directFd.append('model', 'saarika:v2.5');
  directFd.append('language_code', languageCode);

  const res = await fetch(SARVAM_STT_URL, {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey },
    body: directFd,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Sarvam STT authentication failed (${res.status}). Verify/rotate SARVAM_API_KEY and restart frontend/backend. Details: ${body}`);
    }
    throw new Error(`Sarvam STT ${res.status}: ${body}`);
  }

  const data = await res.json();
  // Sarvam returns { transcript: "..." }
  return (data.transcript || '').trim();
}
