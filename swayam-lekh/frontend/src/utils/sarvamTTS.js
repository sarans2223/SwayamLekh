export const playSarvamTTS = async (text, languageCode = 'en-IN') => {
    if (!text || !text.trim()) return null;

    const apiKey = import.meta.env.VITE_SARVAM_API_KEY;
    if (!apiKey) {
        console.warn('[SarvamTTS] Missing VITE_SARVAM_API_KEY, skipping playback');
        return null;
    }

    try {
        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': apiKey,
            },
            body: JSON.stringify({
                inputs: [text],
                target_language_code: languageCode,
                speaker: 'anushka',
                pitch: 0,
                pace: 0.8,
                loudness: 1.5,
                speech_sample_rate: 22050,
                enable_preprocessing: true,
                model: 'bulbul:v2',
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('Sarvam exact error:', JSON.stringify(errorBody));
            throw new Error(`Sarvam API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.audios && data.audios.length > 0) {
            const audioBase64 = data.audios[0];
            const audioUrl = `data:audio/wav;base64,${audioBase64}`;
            const audio = new Audio(audioUrl);
            audio.preload = 'auto';
            const playPromise = audio.play();
            if (playPromise?.catch) {
                playPromise.catch((err) => {
                    if (err?.name === 'AbortError') {
                        console.debug('[SarvamTTS] Play aborted (likely due to pause on navigation)');
                        return;
                    }
                    console.error('[SarvamTTS] Audio play rejected:', err);
                });
            }
            return audio;
        }

        console.warn('[SarvamTTS] No audio payload returned');
        return null;
    } catch (error) {
        console.error('Failed to play TTS via Sarvam:', error);
        return null;
    }
};