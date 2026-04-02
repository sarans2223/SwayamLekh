require('dotenv').config();
const express = require('express');
const uploadAudioRoute = require('./routes/uploadAudio');
const transcribeRoute = require('./routes/transcribe');
const correctRoute = require('./routes/correct');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount audio upload route
app.use('/api', uploadAudioRoute);
app.use('/api', transcribeRoute);
app.use('/api', correctRoute);

app.get('/', (req, res) => {
	res.send('Swayam Lekh Backend Running');
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
