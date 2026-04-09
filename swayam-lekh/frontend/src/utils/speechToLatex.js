import { convertMath } from './mathConverter';

/**
 * Speech-to-LaTeX Converter (Legacy Wrapper)
 * Now redirects to the central mathConverter which uses the backend Math Scribe API
 */

export async function convertToLatex(text, currentMath = null) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Use the advanced backend-backed converter
  return await convertMath(text, currentMath);
}

/**
 * Enhanced version (Legacy Wrapper)
 */
export async function convertToLatexAdvanced(text) {
  return await convertToLatex(text);
}

/**
 * Test function to validate conversions
 */
export async function testConversions() {
  const testCases = [
    { input: 'a square plus b square', expected: 'a^2 + b^2' },
    { input: 'x plus 1 whole square', expected: '(x+1)^2' },
    { input: 'a plus b whole square divided by 2a', expected: '\\frac{(a+b)^2}{2a}' },
    { input: 'square root of x plus y', expected: '\\sqrt{x+y}' },
  ];

  console.log('Testing LaTeX conversions via backend-backed utility:');
  for (const { input, expected } of testCases) {
    const result = await convertToLatex(input);
    const passed = result.replace(/\s+/g, '') === expected.replace(/\s+/g, '');
    console.log(`${passed ? '✅' : '❌'} "${input}" → "${result}"`);
    if (!passed) {
      console.log(`   Expected: "${expected}"`);
    }
  }
}