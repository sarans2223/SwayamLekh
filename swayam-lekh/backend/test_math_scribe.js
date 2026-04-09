const http = require('http');

const testCases = [
  {
    name: 'Direct Conversion',
    payload: { rawText: 'x plus one whole squared' }
  },
  {
    name: 'Incremental Update',
    payload: { currentMath: '$a^2$', newVoiceInput: 'plus b square' }
  }
];

async function runTest(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.payload);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/math-scribe',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          console.log(`[PASS] ${testCase.name}:`, json.latex || json);
          resolve();
        } catch (e) {
          console.log(`[FAIL] ${testCase.name}:`, body);
          resolve();
        }
      });
    });

    req.on('error', (e) => {
      console.log(`[ERROR] ${testCase.name}:`, e.message);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  for (const tc of testCases) {
    await runTest(tc);
  }
}

main();
