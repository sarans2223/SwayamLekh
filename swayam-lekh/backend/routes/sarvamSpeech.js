const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

function getSarvamApiKey() {
  return process.env.SARVAM_API_KEY || '';
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || process.env.GPT_API_KEY || '';
}

router.post('/sarvam-stt', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing audio file.' });
  }

  const apiKey = getSarvamApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing SARVAM_API_KEY on backend.' });
  }

  const languageCode = req.body.language_code || 'en-IN';
  const model = req.body.model || 'saarika:v2.5';

  try {
    const formData = new FormData();
      const audioBlob = new Blob([req.file.buffer], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'speech.wav');

    const response = await fetch(SARVAM_STT_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: formData,
    });

    const payload = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Sarvam STT request failed.', details: payload });
    }

    const data = JSON.parse(payload || '{}');
    return res.json({
      transcript: (data.transcript || '').trim(),
      confidence: data.confidence ?? data.confidence_score ?? null,
      raw: data,
    });
  } catch (error) {
    console.error('[SarvamSpeech] Proxy error', error);
    return res.status(500).json({ error: 'Sarvam STT proxy error', details: error?.message || String(error) });
  }
});

router.post('/whisper', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing audio file.' });
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY on backend.' });
  }

  const languageCode = req.body.language_code || 'en';

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    const audioStream = Readable.from(req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: languageCode,
    });

    return res.json({ transcript: (transcription?.text || '').trim(), raw: transcription });
  } catch (error) {
    console.error('[SarvamSpeech] Whisper fallback error', error);
    return res.status(500).json({ error: 'Whisper fallback failed.', details: error?.message || String(error) });
  }
});

module.exports = router;
