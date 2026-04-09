const express = require('express');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const groqClient = new OpenAI({ 
	apiKey: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY,
	baseURL: 'https://api.groq.com/openai/v1' 
});

router.post('/stt', upload.single('audio'), async (req, res) => {
	const tempFilePath = path.join(os.tmpdir(), `stt-${crypto.randomBytes(8).toString('hex')}.webm`);
	try {
		if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
		fs.writeFileSync(tempFilePath, req.file.buffer);

		// 1. Try Sarvam Primary
		try {
			const bufferSize = req.file.buffer.length;
			const mimeType = req.file.mimetype || 'audio/webm';
			const fileName = req.file.originalname || 'speech.webm';
			
			console.log(`[STT] Processing audio: ${fileName}, size: ${bufferSize} bytes, type: ${mimeType}`);

			const formData = new FormData();
			// Use File object for better FormData compatibility in Node.js
			const audioFile = new File([req.file.buffer], fileName, { type: mimeType });
			formData.append('file', audioFile);
			
			if (req.body.language_code) formData.append('language_code', req.body.language_code);
			if (req.body.model) formData.append('model', req.body.model);

			const sarvamResponse = await fetch('https://api.sarvam.ai/speech-to-text', {
				method: 'POST',
				headers: {
					'api-subscription-key': process.env.VITE_SARVAM_API_KEY || process.env.SARVAM_API_KEY,
				},
				body: formData
			});

			if (sarvamResponse.ok) {
				const data = await sarvamResponse.json();
				if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
				console.log('[STT] Sarvam success');
				return res.json(data);
			}

			const errText = await sarvamResponse.text().catch(() => 'No error body');
			console.warn('[STT] Sarvam failed, trying Groq fallback. Status:', sarvamResponse.status, 'Body:', errText);
		} catch (sarvamErr) {
			console.warn('[STT] Sarvam service error, trying Groq fallback:', sarvamErr.message);
		}

		// 2. Fallback to Groq
		const transcription = await groqClient.audio.transcriptions.create({
			file: fs.createReadStream(tempFilePath),
			model: 'whisper-large-v3',
			language: req.body.language_code ? req.body.language_code.split('-')[0] : 'en',
			response_format: 'json',
		});

		if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

		res.json({
			transcript: transcription.text,
			text: transcription.text,
			provider: 'groq'
		});

	} catch (error) {
		if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
		console.error('STT Final Error:', error);
		res.status(500).json({ error: error.message });
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
