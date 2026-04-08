import { MATH_PATTERNS } from '../data/mathDictionary';

/**
 * Applies all math patterns to convert spoken text to LaTeX
 * @param {string} spokenText - The spoken math expression
 * @returns {string} - LaTeX notation
 */
export function convertSpokenMathToLatex(spokenText) {
  if (!spokenText || typeof spokenText !== 'string') {
    return '';
  }

  let result = spokenText;
  let matchCount = 0;

  // Apply each pattern in order (order is critical)
  for (const { pattern, replacement } of MATH_PATTERNS) {
    const previousResult = result;
    
    if (typeof replacement === 'string') {
      result = result.replace(pattern, replacement);
    } else if (typeof replacement === 'function') {
      result = result.replace(pattern, replacement);
    }

    // Log matches to console
    if (result !== previousResult) {
      const matches = previousResult.match(pattern);
      if (matches) {
        matchCount++;
        // Reduced noise: only debug-log pattern matches when verbose flag is enabled
        if (process.env.NODE_ENV !== 'production') {
          console.debug(
            `MathConverter [Pattern ${matchCount}]: "${previousResult}" → "${result}"`,
            { pattern: pattern.source, matches }
          );
        }
      }
    }
  }
  if (process.env.NODE_ENV !== 'production') console.debug(`MathConverter: Final LaTeX output: "${result}"`);
  return result;
}

/**
 * Uses Groq LLaMA as a fallback for expressions the pattern engine couldn't handle
 * @param {string} spokenText - The spoken expression
 * @returns {Promise<string>} - LaTeX notation from Groq
 */
export async function convertWithGroq(spokenText) {
  if (!spokenText || typeof spokenText !== 'string') {
    return '';
  }

  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('MathConverter: Groq API key not configured');
      return spokenText;
    }

    const systemPrompt = `You are a math notation converter for Indian high school and JEE students.
Convert spoken math English to LaTeX notation.
Return ONLY the LaTeX string. No explanation. No markdown. No backticks.
The student may say variables like x, y, a, b, theta, alpha or any letter.
Apply patterns dynamically to whatever variable or expression they use.
Examples:
"x squared" → x^2
"a squared" → a^2
"sin theta squared" → \\sin^2(\\theta)
"integral from 0 to pi of sin x dx" → \\int_{0}^{\\pi} \\sin(x) \\, dx
"limit x tends to 0 of sin x by x" → \\lim_{x \\to 0} \\frac{\\sin x}{x}
"a plus b whole squared" → (a+b)^2
"e to the power minus x" → e^{-x}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Convert to LaTeX: "${spokenText}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('MathConverter Groq error:', errorData);
      return spokenText;
    }

    const data = await response.json();
    const groqOutput = data.choices?.[0]?.message?.content?.trim() || '';
    
    if (process.env.NODE_ENV !== 'production') console.debug(`MathConverter Groq fallback: "${spokenText}" → "${groqOutput}"`);
    return groqOutput || spokenText;
  } catch (err) {
    console.error('MathConverter Groq API call failed:', err);
    return spokenText;
  }
}

/**
 * Main conversion function: pattern engine first, Groq fallback if needed
 * @param {string} spokenText - The spoken math expression
 * @returns {Promise<string>} - Final LaTeX notation
 */
export async function convertMath(spokenText) {
  if (!spokenText || typeof spokenText !== 'string') {
    return '';
  }

  // First attempt: pattern engine
  let result = convertSpokenMathToLatex(spokenText);

  // Check if there are still unconverted words (fallback to Groq)
  const containsUnconvertedWords = /\b(and|or|the|a|of|in|to|from|with|by|for|is|are)\b/gi.test(result);
  
  if (containsUnconvertedWords && result === spokenText) {
    // Pattern engine didn't match anything, try Groq
    if (process.env.NODE_ENV !== 'production') console.debug('MathConverter: Pattern engine insufficient, calling Groq fallback');
    result = await convertWithGroq(spokenText);
  }

  return result;
}
