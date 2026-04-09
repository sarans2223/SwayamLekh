// src/utils/mathConverter.js
import { MATH_PATTERNS } from '../data/mathDictionary';

/**
 * Basic Regex conversion for simple symbols
 */
export function convertSpokenMathToLatex(spokenText) {
  if (!spokenText || typeof spokenText !== 'string') return '';

  let result = spokenText.toLowerCase();

  // Apply patterns in order
  for (const { pattern, replacement } of MATH_PATTERNS) {
    if (typeof replacement === 'function') {
      result = result.replace(pattern, replacement);
    } else {
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
 * Main function: Uses AI for complex math, falls back to Regex
 */
export async function convertMath(spokenText, currentMath = null) {
  if (!spokenText) return '';

  // 1. Identify complex structures
  const complexWords = ['integral', 'limit', 'summation', 'fraction', 'derivative', 'root', 'reaction', 'yield', 'equilibrium', 'equation'];
  const isComplex = complexWords.some(word => spokenText.toLowerCase().includes(word));

  if (isComplex) {
    try {
      // 2. Call the AI Backend (Gemini/Math-Scribe)
      // Send the ORIGINAL text so the AI sees context
      const response = await fetch('/api/math-scribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: spokenText, currentMath })
      });

      const data = await response.json();
      if (data.latex) return data.latex;
    } catch (err) {
      console.warn("AI Backend failed, using local dictionary.");
    }
  }

  // 3. Simple Fallback
  return convertSpokenMathToLatex(spokenText);
}
