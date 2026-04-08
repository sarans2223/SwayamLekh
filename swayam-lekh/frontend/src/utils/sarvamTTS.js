import { latexToSpeakable } from './latexToSpeakable';
import { setTTSPlaying } from './audioState.js';

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

function speakWithBrowserTTS(text, languageCode = 'en-IN') {
    const synth = window.speechSynthesis;
    if (!synth) {
        setTTSPlaying(false);
        return null;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(latexToSpeakable(text));
    utterance.lang = languageCode;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    let stopped = false;
    const controller = {
        onended: null,
        onerror: null,
        pause: () => {
            if (stopped) return;
            synth.cancel();
            setTTSPlaying(false);
            stopped = true;
        },
    };

    utterance.onend = () => {
        setTimeout(() => {
            setTTSPlaying(false);
            stopped = true;
            if (typeof controller.onended === 'function') controller.onended();
        }, 800);
    };
    utterance.onerror = () => {
        setTTSPlaying(false);
        stopped = true;
        if (typeof controller.onerror === 'function') controller.onerror();
    };

    setTTSPlaying(true);
    synth.speak(utterance);

    return controller;
}

export const playSarvamTTS = async (text, languageCode = 'en-IN') => {
    if (!text || !text.trim()) return null;

    setTTSPlaying(true);
    const apiKey = import.meta.env.VITE_SARVAM_API_KEY;
    if (!apiKey) {
        console.warn('[SarvamTTS] Missing VITE_SARVAM_API_KEY, falling back to browser speech');
        return speakWithBrowserTTS(text, languageCode);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(SARVAM_TTS_URL, {
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
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error('Sarvam exact error:', JSON.stringify(errorBody));
            if (response.status === 429 || response.status === 503 || response.status === 502) {
                console.warn(`[SarvamTTS] Sarvam busy (${response.status}); falling back to browser speech`);
                return speakWithBrowserTTS(text, languageCode);
            }
            throw new Error(`Sarvam API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.audios && data.audios.length > 0) {
            const audioBase64 = data.audios[0];
            const audioUrl = `data:audio/wav;base64,${audioBase64}`;
            const audio = new Audio(audioUrl);
            audio.preload = 'auto';
            audio.addEventListener('ended', () => {
                setTimeout(() => {
                    setTTSPlaying(false);
                }, 800);
            });
            audio.addEventListener('error', () => {
                setTTSPlaying(false);
            });

            const originalPause = audio.pause.bind(audio);
            audio.pause = (...args) => {
                const result = originalPause(...args);
                setTTSPlaying(false);
                return result;
            };

            const playPromise = audio.play();
            if (playPromise?.catch) {
                playPromise.catch((err) => {
                    setTTSPlaying(false);
                    if (err?.name === 'AbortError') {
                        console.debug('[SarvamTTS] Play aborted (likely due to pause on navigation)');
                        return;
                    }
                    console.error('[SarvamTTS] Audio play rejected:', err);
                    console.warn('[SarvamTTS] Falling back to browser TTS due to play() rejection');
                    try {
                        // attempt browser TTS fallback
                        speakWithBrowserTTS(text, languageCode);
                    } catch (fallbackErr) {
                        console.error('[SarvamTTS] Browser TTS fallback failed:', fallbackErr);
                    }
                });
            }
            return audio;
        }

        console.warn('[SarvamTTS] No audio payload returned');
        return speakWithBrowserTTS(text, languageCode);
    } catch (error) {
        setTTSPlaying(false);
        if (error?.name === 'AbortError') {
            console.warn('[SarvamTTS] Sarvam request timed out; falling back to browser speech');
            return speakWithBrowserTTS(text, languageCode);
        }

        console.error('Failed to play TTS via Sarvam:', error);
        return speakWithBrowserTTS(text, languageCode);
    }
};