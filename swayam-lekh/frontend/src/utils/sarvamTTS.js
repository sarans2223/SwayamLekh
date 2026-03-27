export const playSarvamTTS = async (text, languageCode = 'en-IN') => {
    try {
        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': import.meta.env.VITE_SARVAM_API_KEY,
            },
            body: JSON.stringify({
                inputs: [text],
                target_language_code: languageCode,
                speaker: "anushka",
                pitch: 0,
                pace: 1.0,
                loudness: 1.5,
                speech_sample_rate: 22050,
                enable_preprocessing: true,
                model: "bulbul:v2"
            }),
        });

        // Log exact error from Sarvam
        if (!response.ok) {
            const errorBody = await response.json()
            console.error('Sarvam exact error:', JSON.stringify(errorBody))
            throw new Error(`Sarvam API error: ${response.status}`)
        }

        const data = await response.json();

        if (data.audios && data.audios.length > 0) {
            const audioBase64 = data.audios[0];
            const audioUrl = `data:audio/wav;base64,${audioBase64}`;
            const audio = new Audio(audioUrl);

            return new Promise((resolve) => {
                audio.onended = resolve;
                audio.play().catch(e => console.error("Audio play failed:", e));
            });
        }
    } catch (error) {
        console.error("Failed to play TTS via Sarvam:", error);
    }
};