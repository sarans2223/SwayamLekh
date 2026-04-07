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
router.post('/stt', upload.single('audio'), (req, res) => {
	return res.status(503).json({ error: 'Server STT disabled; frontend handles STT directly.' });
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
