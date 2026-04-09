import { convertMath } from './frontend/src/utils/mathConverter.js';
// Mock import.meta.env for the test
global.import = {
  meta: {
    env: {
      VITE_GEMINI_API_KEY: 'AIzaSyAPPh0Nuctnoge2VA06p-DeF6R1nyV3Szs'
    }
  }
};

async function test() {
  const inputs = [
    "20x power four",
    "dy by dx",
    "integral",
    "x power four minus b square and the internal components that we have"
  ];

  for (const input of inputs) {
    console.log(`Input: "${input}"`);
    try {
      const result = await convertMath(input);
      console.log(`Result: "${result}"`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
    console.log('---');
  }
}

test();
