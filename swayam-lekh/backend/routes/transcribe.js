const express = require('express');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const groqClient = new OpenAI({ apiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY });

// STT via frontend; keep endpoint stubbed
router.post('/stt', upload.single('audio'), async (req, res) => {
	// return res.status(503).json({ error: 'Server STT disabled; frontend handles STT directly.' });

	// Enable Sarvam STT proxy
	if (!req.file) {
		return res.status(400).json({ error: 'Missing audio file.' });
	}

	const apiKey = process.env.SARVAM_API_KEY || process.env.VITE_SARVAM_API_KEY || '';
	if (!apiKey) {
		return res.status(500).json({ error: 'Missing SARVAM_API_KEY.' });
	}

	const languageCode = req.body.language_code || 'en-IN';
	const model = req.body.model || 'saarika:v2.5';

	try {
		const formData = new FormData();
		const audioBlob = new Blob([req.file.buffer], { type: 'audio/webm' });
		formData.append('file', audioBlob, 'speech.webm');
		formData.append('language_code', languageCode);
		formData.append('model', model);

		const response = await fetch('https://api.sarvam.ai/speech-to-text', {
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
		});
	} catch (error) {
		console.error('[STT Proxy] Error', error);
		return res.status(500).json({ error: 'STT proxy error', details: error?.message || String(error) });
	}
});

async function runGroqHealthCheck() {
	if (!groqClient.apiKey) {
		return { ok: false, reason: 'Groq API key missing' };
	}
	try {
		const completion = await groqClient.responses.create({
			model: 'llama-3.3-70b-versatile',
			input: [{ role: 'user', content: [{ type: 'text', text: 'say ok' }] }],
			max_output_tokens: 5,
			temperature: 0,
		});
		const transcript = completion?.output_text || completion?.data?.[0]?.content?.[0]?.text || 'ok';
		return { ok: true, transcript };
	} catch (err) {
		return { ok: false, error: err?.message || err };
	}
}

router.get('/stt/health', async (req, res) => {
	const result = await runGroqHealthCheck();
	if (result.ok) return res.json({ status: 'ok', transcript: result.transcript });
	return res.status(500).json({ status: 'error', error: result.error || result.reason || 'unknown' });
});

router.runGroqHealthCheck = runGroqHealthCheck;

module.exports = router;
