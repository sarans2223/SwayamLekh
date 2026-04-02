/**
 * Runs phonetic cleanup locally, then asks backend to context-correct using Groq.
 * Falls back to the locally cleaned text if the backend call fails.
 */
export async function correctTranscript(rawText = '', questionText = '', subject = '', options = {}) {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return '';

  const { force = false } = options;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  // Skip Groq when utterance is too short (prevents over-correction on tokens like "colon")
  if (!force && (trimmed.length < 12 || wordCount < 3)) {
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

/**
 * Answer-focused post-processing using Groq correction.
 * This forces correction even for short answer chunks so domain words can still be fixed.
 */
export async function postProcessAnswer(rawTranscript = '', subject = '', questionText = '') {
  return correctTranscript(rawTranscript, questionText, subject, { force: true });
}
