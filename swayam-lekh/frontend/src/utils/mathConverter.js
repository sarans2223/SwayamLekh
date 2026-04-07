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
        console.log(
          `MathConverter [Pattern ${matchCount}]: "${previousResult}" → "${result}"`,
          { pattern: pattern.source, matches }
        );
      }
    }
  }

  console.log(`MathConverter: Final LaTeX output: "${result}"`);
  return result;
}

/**
 * Uses the backend Math Scribe API for high-precision LaTeX conversion
 * @param {string} spokenText - The spoken expression
 * @param {string} currentMath - (Optional) The current LaTeX state for incremental updates
 * @returns {Promise<string>} - LaTeX notation from the backend
 */
export async function convertWithBackendScribe(spokenText, currentMath = null) {
  if (!spokenText || typeof spokenText !== 'string') {
    return '';
  }

  try {
    const payload = currentMath 
      ? { currentMath, newVoiceInput: spokenText }
      : { rawText: spokenText };

    const response = await fetch('/api/math-scribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Math Scribe API error:', errorData);
      return spokenText;
    }

    const data = await response.json();
    return data.latex || spokenText;
  } catch (err) {
    console.error('Math Scribe API call failed:', err);
    return spokenText;
  }
}

/**
 * Main conversion function: pattern engine first, backend Math Scribe fallback
 * @param {string} spokenText - The spoken math expression
 * @param {string} currentMath - (Optional) The current LaTeX state for incremental updates
 * @returns {Promise<string>} - Final LaTeX notation
 */
export async function convertMath(spokenText, currentMath = null) {
  if (!spokenText || typeof spokenText !== 'string') {
    return '';
  }

  // Log the request
  console.log('MathConverter: Input:', { spokenText, currentMath });

  // First attempt: pattern engine (fast for basic stuff)
  let result = convertSpokenMathToLatex(spokenText);

  // Check if the pattern engine did anything meaningful or if there are still words
  // For most education-level math, we want the high-precision backend anyway
  const needsHighPrecision = /\b(whole|quantity|divided by|integral|limit|summation|of|from|to)\b/gi.test(spokenText) || 
                            result === spokenText;
  
  if (needsHighPrecision) {
    console.log('MathConverter: Requesting high-precision backend conversion');
    try {
      result = await convertWithBackendScribe(spokenText, currentMath);
    } catch (err) {
      console.warn('MathConverter: Backend conversion failed, using regex result', err);
    }
  }

  return result;
}
