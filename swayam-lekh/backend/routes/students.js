const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

const sanitizeFilePart = (value = '') => value.toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

const parseDataUrl = (dataUrl = '') => {
	const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
	if (!match) {
		return null;
	}

	const mimeType = match[1];
	const base64Data = match[2];
	const buffer = Buffer.from(base64Data, 'base64');

	if (!buffer.length) {
		return null;
	}

	return { mimeType, buffer };
};

// POST /api/upload-photo
router.post('/upload-photo', async (req, res) => {
	try {
		const { regNo, name, dataUrl } = req.body;

		if (!regNo || !dataUrl) {
			return res.status(400).json({ error: 'regNo and dataUrl are required' });
		}

		const parsed = parseDataUrl(dataUrl);
		if (!parsed) {
			return res.status(400).json({ error: 'Invalid image data URL' });
		}

		const safeRegNo = sanitizeFilePart(regNo);
		const safeName = sanitizeFilePart(name || 'student');
		const extension = parsed.mimeType.includes('png') ? 'png' : 'jpg';
		const fileName = `${safeRegNo}_${safeName}_${Date.now()}.${extension}`;

		const { data: up, error: upErr } = await supabase.storage
			.from('student-photos')
			.upload(fileName, parsed.buffer, { contentType: parsed.mimeType, upsert: true });

		if (upErr) {
			return res.status(500).json({ error: upErr.message });
		}

		const { error: dbErr } = await supabase.from('student_verifications').upsert({
			register_no: regNo,
			student_name: name,
			photo_path: up.path,
			captured_at: new Date().toISOString(),
		});

		if (dbErr) {
			return res.status(500).json({ error: dbErr.message });
		}

		return res.json({ success: true, path: up.path });
	} catch (err) {
		console.error('Photo upload error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
