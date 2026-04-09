const express = require('express');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const ASSISTANT_SYSTEM_PROMPT = `Role: You are the MathScribe Engine for SwayamLekh.
Task: Convert raw, spoken mathematical text into clean, standard LaTeX and handle exam commands.

Rules:
- Output ONLY the raw LaTeX string or command tag. Do not say "Here is your code" or "Sure."
- Convert "integral" to \\int, "square bracket" to [, and "plus minus" to \\pm.
- Handle powers: "x power 5", "x to the power 5", "x square", or "x cube".
- Handle new lines: If the user says "new line" or "next line", return a literal newline character (\\n).
- Handle bounds: "integral from a to b" -> \\int_{a}^{b}.
- Handle fractions: "x by y" or "x over y" -> \\frac{x}{y}.
- If the input is not math, return the text as-is.
- Command Handling:
  - "time left" or "how much time" -> [COMMAND:GET_TIME].
  - "submit exam" -> [COMMAND:SUBMIT].
  - When given seconds (e.g., "System message: 180 seconds"), translate to: "You have X minutes and Y seconds remaining."

Example 1:
Input: "integral from zero to infinity of e to the power minus x square dx"
Output: \\int_{0}^{\infty} e^{-x^2} \\, dx

Example 2:
Input: "x plus y new line a plus b"
Output: x + y
a + b`;

router.post('/intent', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Groq API key missing' });
  }

  const { transcript = '', context = [] } = req.body || {};

  if (!transcript.trim()) {
    return res.json({ response: '' });
  }

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
        max_tokens: 150,
        messages: [
          { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
          ...context,
          { role: 'user', content: transcript },
        ],
      }),
    });

    if (!groqRes.ok) {
      const body = await groqRes.text().catch(() => '');
      throw new Error(`Groq intent failed: ${body || groqRes.status}`);
    }

    const data = await groqRes.json();
    let response = data?.choices?.[0]?.message?.content?.trim?.() || '';

    // NEW: Clean up any $ or $$ delimiters from assistant response
    response = response.replace(/\$/g, '');

    return res.json({ response });
  } catch (err) {
    console.error('[intent-api] Error:', err);
    return res.status(500).json({ error: err?.message || 'Groq intent error' });
  }
});

module.exports = router;
