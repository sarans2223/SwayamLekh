const express = require('express');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MATH_SCRIBE_SYSTEM_PROMPT = `Role: You are the MathScribe Engine for SwayamLekh.
Task: Convert raw, spoken mathematical text into clean, standard LaTeX.

Rules:
- Output ONLY the raw LaTeX string. Do not say "Here is your code" or "Sure."
- Convert "integral" to \\int, "square bracket" to [, and "plus minus" to \\pm.
- Handle powers: "x power 5", "x to the power 5", "x square", or "x cube".
- Handle new lines: If the user says "new line" or "next line", return a literal newline character (\\n).
- Handle bounds: "integral from a to b" -> \\int_{a}^{b}.
- Handle fractions: "x by y" or "x over y" -> \\frac{x}{y}.
- Handle chemistry: Elements with numbers ("H two O" -> H_{2}O), reactions ("yields" -> \\rightarrow, "equilibrium" -> \\rightleftharpoons, "delta" -> \\Delta).
- If the input is not math or chemistry, return the text as-is.
- Command Handling: If the user says "time left" or "how much time", respond with EXACTLY: [COMMAND:GET_TIME]. If they say "submit exam", respond with EXACTLY: [COMMAND:SUBMIT].

Example 1:
Input: "integral from zero to infinity of e to the power minus x square dx"
Output: \\int_{0}^{\infty} e^{-x^2} \\, dx

Example 2:
Input: "x power 5 plus 3 x square"
Output: x^{5} + 3x^{2}

Example 3:
Input: "x plus y new line a plus b"
Output: x + y
a + b`;

router.post('/math-scribe', async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Groq API key missing' });
  }

  const { rawText, currentMath, newVoiceInput } = req.body || {};

  let userMessage = '';
  if (currentMath !== undefined && newVoiceInput !== undefined) {
    // Incremental Mode
    userMessage = `Current Math: ${currentMath}
New Voice Input: "${newVoiceInput}"
Instruction: Append the new input to the current math logically and return the full updated LaTeX.`;
  } else if (rawText) {
    // Direct Mode
    userMessage = `Input: "${rawText}"`;
  } else {
    return res.status(400).json({ error: 'Missing input (rawText or currentMath/newVoiceInput)' });
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
        max_tokens: 256,
        messages: [
          { role: 'system', content: MATH_SCRIBE_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!groqRes.ok) {
      const body = await groqRes.text().catch(() => '');
      return res.status(groqRes.status).json({ error: body || 'Math Scribe conversion failed' });
    }

    const data = await groqRes.json();
    let latex = data?.choices?.[0]?.message?.content?.trim?.() || '';

    // Remove any accidental markdown backticks or "latex" prefix if the model ignored the constraint
    latex = latex.replace(/^```latex\n?/, '').replace(/\n?```$/, '');
    // NEW: Clean up any $ or $$ delimiters that might have been returned
    latex = latex.replace(/^\$\$?/, '').replace(/\$\$?$/, '');

    return res.json({ latex });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Math Scribe conversion error' });
  }
});

module.exports = router;
