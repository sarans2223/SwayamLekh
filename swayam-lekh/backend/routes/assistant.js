const express = require('express');
const router = express.Router();

router.post('/assistant', async (req, res) => {
  const { query, systemPrompt } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('Groq API key missing');
    return res.status(500).json({ error: 'Assistant configuration missing' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq Assistant API Error:', errorData);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('Assistant Proxy Error:', err);
    res.status(500).json({ error: 'Failed to connect to Assistant' });
  }
});

module.exports = router;
