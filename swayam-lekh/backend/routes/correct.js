const express = require('express');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/correct', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Groq API key missing', correctedText: req.body?.rawText || '' });
  }

  const { rawText = '', questionText = '', subject = '' } = req.body || {};

   const trimmedRaw = (rawText || '').trim();
   if (!trimmedRaw) {
     // Never generate text without student speech input
     return res.json({ correctedText: '' });
   }

  const systemPrompt = `You are a speech-to-text correction assistant for Indian board examinations.
A student with a disability is speaking their exam answer using a voice scribe system.
Fix ONLY words that were clearly mispronounced or misheard by the speech recognition.
Use the question text and subject as context to identify correct technical terms.
Do NOT add new content, steps, structure, or information the student did not say.
Do NOT fix grammar or improve sentences.
Do NOT remove anything the student said.
Return ONLY the corrected transcript. Nothing else.`;

  const userMessage = `Subject: ${subject || 'general'}
Question: ${questionText || ''}
Raw transcript: ${trimmedRaw}
Correct only mispronounced or misheard words.`;

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 120,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!groqRes.ok) {
      const body = await groqRes.text().catch(() => '');
      return res.status(groqRes.status).json({ error: body || 'Groq correction failed', correctedText: rawText });
    }

    const data = await groqRes.json();
    const correctedText = data?.choices?.[0]?.message?.content?.trim?.() || rawText;
    const rawWords = trimmedRaw.split(/\s+/).filter(Boolean).length;
    const corrWords = (correctedText || '').split(/\s+/).filter(Boolean).length;
    // Guardrails: do not allow large expansions over raw speech
    if (corrWords > rawWords + 8 || correctedText.length > trimmedRaw.length + 80) {
      return res.json({ correctedText: trimmedRaw });
    }
    return res.json({ correctedText });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Groq correction error', correctedText: rawText });
  }
});

module.exports = router;
