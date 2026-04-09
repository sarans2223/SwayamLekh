const { MATH_PATTERNS } = require('./swayam-lekh/frontend/src/data/mathDictionary');

function testConversion(spokenText) {
  let result = spokenText;
  for (const { pattern, replacement } of MATH_PATTERNS) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern, replacement);
    } else if (typeof replacement === 'function') {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

const testCases = [
  { input: 'x power 5', expected: 'x^{5}' },
  { input: 'a plus b power 2', expected: 'a + b^{2}' },
  { input: 'x squared plus y squared', expected: 'x^2 + y^2' },
  { input: 'new line', expected: '\n' },
  { input: 'x plus y next line a plus b', expected: 'x + y\na + b' },
  { input: 'integral of x power 2 dx', expected: '\\int x^{2} \\, dx' }
];

console.log('--- Math Regex Testing ---');
testCases.forEach(({ input, expected }) => {
  const result = testConversion(input);
  const passed = result === expected;
  console.log(`${passed ? '✅' : '❌'} "${input}"`);
  console.log(`   Result:   "${result.replace(/\n/g, '\\n')}"`);
  console.log(`   Expected: "${expected.replace(/\n/g, '\\n')}"`);
});
