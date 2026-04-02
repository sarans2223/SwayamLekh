/**
 * Runs phonetic cleanup locally, then asks backend to context-correct using Groq.
 * Falls back to the locally cleaned text if the backend call fails.
 */
export async function correctTranscript(rawText = '', questionText = '', subject = '') {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return '';

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  // Skip Groq when utterance is too short (prevents over-correction on tokens like "colon")
  if (trimmed.length < 12 || wordCount < 3) {
    return trimmed;
  }

  const payload = {
    rawText: trimmed,
    questionText,
    subject,
  };

  try {
    const res = await fetch('/api/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Groq correction failed: ${res.status}`);
    }

    const data = await res.json();
    const corrected = (data.correctedText || '').trim();
    return corrected || rawText;
  } catch (err) {
    console.warn('[correctTranscript] Falling back to phonetic output:', err?.message || err);
    return rawText;
  }
}
