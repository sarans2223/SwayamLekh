const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/speak', async (req, res) => {
  const { text, voice = 'nova' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key missing in environment');
    return res.status(500).json({ error: 'TTS configuration missing' });
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice, // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // Return as base64 to match the Sarvam structure expected by the frontend hook
    const base64Audio = buffer.toString('base64');
    
    res.json({ audio: base64Audio });
  } catch (err) {
    console.error('OpenAI TTS Error:', err.message || err);
    res.status(500).json({ error: 'Failed to generate speech', details: err.message });
  }
});

module.exports = router;
