const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabase');
const router = express.Router();

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/upload-audio
router.post('/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    const { regNo, name, commandIndex, commandText } = req.body;
    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    const fileName = `${regNo}/cmd_${commandIndex}_${Date.now()}.webm`;
    // Upload to Supabase Storage
    const { data: up, error: upErr } = await supabase.storage
      .from('voice-profiles')
      .upload(fileName, audioFile.buffer, { contentType: 'audio/webm', upsert: false });
    if (upErr) return res.status(500).json({ error: upErr.message });

    // Optionally, insert a record in the DB (if needed)
    // await supabase.from('voice_profiles').insert([{ ... }]);

    res.json({ success: true, path: up.path });
  } catch (err) {
    console.error('Audio upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
