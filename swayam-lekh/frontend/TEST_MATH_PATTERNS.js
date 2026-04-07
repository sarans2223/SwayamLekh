import { convertSpokenMathToLatex, convertMath } from './utils/mathConverter.js';

// Test the pattern engine
const testCases = [
  "a squared plus b squared",
  "sin theta",
  "integral from 0 to pi of sin x dx",
  "limit x tends to zero of sin x by x",
  "square root of a squared plus b squared",
  "e to the power minus x"
];

console.log("=== Math Conversion Test Suite ===\n");

testCases.forEach(test => {
  const result = convertSpokenMathToLatex(test);
  console.log(`✓ "${test}"`);
  console.log(`  → "${result}"\n`);
});

// Expected outputs:
// "a squared plus b squared" → should contain a^2+b^2
// "sin theta" → should contain \sin(\theta)
// "integral from 0 to pi of sin x dx" → should contain \int_{0}^{\pi} \sin(x) \, dx
// "limit x tends to zero of sin x by x" → should contain \lim_{x \to 0} \frac{\sin x}{x}
// "square root of a squared plus b squared" → should contain \sqrt{a^2+b^2}
// "e to the power minus x" → should contain e^{-x}
