import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { useExam } from '../context/ExamContext';
import { sarvamTranscribe } from '../utils/sarvamSTT';
import { playSarvamTTS } from '../utils/sarvamTTS';
import { formatTimeToSpeech } from '../utils/formatters';
import { detectVoiceCommand } from '../utils/voiceCommandMatcher';

export default function InstructionsPage() {
    const navigate = useNavigate();
    const { student } = useStudent();
    const { state, startExamTimer } = useExam();
    const audioRef = useRef(null);
    const [audioError, setAudioError] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const srRef = useRef(null);
    const deadRef = useRef(false);

    useEffect(() => {
        const audio = new Audio('/audio/instruction_voice.mp3');
        audioRef.current = audio;

        const handleEnded = () => {
            navigate('/voice-setup', { state: { subjectMode: student?.subjectMode } });
        };

        const handleError = () => {
            setAudioError(true);
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        // Attempt to play automatically
        audio.play().catch(() => {
            setAudioError(true);
        });

        return () => {
            deadRef.current = true;
            if (srRef.current) {
                try { srRef.current.stop(); } catch (e) {}
            }
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            audio.pause();
        };
    }, [navigate, student?.subjectMode]);

    const getAssistantIntent = async (transcript, context = []) => {
        try {
            const resp = await fetch('http://localhost:5000/api/intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, context }),
            });
            if (!resp.ok) return '';
            const data = await resp.json();
            return data.response || '';
        } catch (err) {
            console.error('[intent] AI response failed:', err);
            return '';
        }
    };

    const speakText = async (text) => {
        const langCode = student?.instructionLang === 'ta' ? 'ta-IN' : 'en-IN';
        try {
            const audio = await playSarvamTTS(text, langCode);
            return audio;
        } catch (e) {
            console.error('Sarvam TTS failed', e);
            return null;
        }
    };

    const handleVoiceCommand = async (transcript) => {
        const normalized = transcript.toLowerCase().trim();
        const matched = detectVoiceCommand(normalized);

        if (matched === 'time left') {
            const intent = await getAssistantIntent(normalized);
            
            if (intent.includes('[GET_TIME]')) {
                const seconds = state.timeLeft;
                const naturalSentence = await getAssistantIntent(`System message: ${seconds} seconds`);
                if (naturalSentence) {
                    const wasPlaying = audioRef.current && !audioRef.current.paused;
                    if (wasPlaying) audioRef.current.pause();

                    const audio = await speakText(naturalSentence);
                    if (audio) {
                        audio.onended = () => {
                            if (wasPlaying && !deadRef.current) audioRef.current.play().catch(() => {});
                        };
                    } else {
                        if (wasPlaying && !deadRef.current) audioRef.current.play().catch(() => {});
                    }
                } else {
                    const lang = student?.instructionLang === 'ta' ? 'ta' : 'en';
                    await speakText(formatTimeToSpeech(seconds, lang));
                }
            } else if (intent) {
                await speakText(intent);
            }
            return true;
        }

        if (normalized.includes('proceed') || normalized.includes('skip') || normalized.includes('next')) {
            navigate('/voice-setup', { state: { subjectMode: student?.subjectMode } });
            return true;
        }
        return false;
    };

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;

        const startSR = () => {
             if (deadRef.current) return;
             const sr = new SR();
             sr.lang = student?.instructionLang === 'ta' ? 'ta-IN' : 'en-IN';
             sr.continuous = false;
             sr.interimResults = false;

             sr.onresult = (e) => {
                 const transcript = e.results[0][0].transcript;
                 handleVoiceCommand(transcript);
             };

             sr.onend = () => {
                 if (!deadRef.current) setTimeout(startSR, 1000);
             };

             srRef.current = sr;
             try { sr.start(); } catch (e) {}
        };

        startSR();
        setIsListening(true);

        return () => {
            deadRef.current = true;
            if (srRef.current) {
                try { srRef.current.stop(); } catch (e) {}
            }
        };
    }, [student?.instructionLang]);

    if (audioError) {
        return (
            <div style={S.root}>
                <div style={S.header}>
                    <span>Swayam Lekh — Instructions</span>
                    <div style={S.headerRight}>
                        <span>Reg: <strong>{student?.registerNo || '—'}</strong></span>
                        <span>Name: <strong>{student?.name || 'Guest'}</strong></span>
                    </div>
                </div>
                <div style={S.pageWrap}>
                    <div style={{ ...S.card, textAlign: 'center', padding: '60px 40px' }}>
                        <div style={{ fontSize: 52, marginBottom: 16 }}>🔊</div>
                        <h2 style={S.title}>Audio Playback Blocked</h2>
                        <p style={{ ...S.sub, marginBottom: 36 }}>
                            Please allow audio playback in your browser and refresh the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={S.ctaButton}
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={S.root}>
            <div style={S.header}>
                <span>Swayam Lekh — Instructions</span>
                <div style={S.headerRight}>
                    <span>Reg: <strong>{student?.registerNo || '—'}</strong></span>
                    <span>Name: <strong>{student?.name || 'Guest'}</strong></span>
                </div>
            </div>

            <div style={S.pageWrap}>
                <div style={S.heroCard}>
                    <h1 style={S.heroHeading}>Welcome back</h1>
                    <p style={S.heroSubtitle}>I am your AI Scribe</p>
                    <p style={S.bodyText}>
                        I’m so happy to be your voice today. Your supervisor has set up your session, so take a deep breath and relax — we are a team today.
                    </p>
                </div>

                <div style={S.infoGrid}>
                    <div style={{ ...S.infoCard, ...S.infoCardPrimary }}>
                        <p style={S.infoTitle}>Instruction Page</p>
                        <p style={S.infoBody}>Your AI Scribe will read these instructions aloud. Listen carefully.</p>
                    </div>

                    <div style={{ ...S.infoCard, ...S.infoCardLight }}>
                        <p style={S.infoTitle}>📋 List the commands</p>
                        <p style={S.infoBody}>Say <strong>"LIST THE COMMANDS"</strong> to hear all available voice commands.</p>
                    </div>

                    <div style={{ ...S.infoCard, ...S.infoCardLight }}>
                        <p style={S.infoTitle}>💡 Get supervisor help</p>
                        <p style={S.infoBody}>Say <strong>"HELP HELP HELP"</strong> at any time to get assistance from your supervisor.</p>
                    </div>
                </div>

                <div style={S.buttonRow}>
                    <button
                        onClick={() => navigate('/voice-setup', { state: { subjectMode: student?.subjectMode } })}
                        style={S.ctaButton}
                    >
                        Proceed to Voice Setup
                    </button>
                </div>
            </div>
        </div>
    );
}

const S = {
    root: {
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#e9f2fb',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, Arial, sans-serif',
        color: '#1f3a5d',
    },
    header: {
        height: 60,
        backgroundColor: '#1f4f91',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        fontSize: 14,
        fontWeight: 700,
        gap: 14,
    },
    headerRight: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 12,
        opacity: 0.95,
        flexWrap: 'wrap',
    },
    pageWrap: {
        flex: 1,
        width: '100%',
        maxWidth: 920,
        height: '100%',
        margin: '0 auto',
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: 12,
    },
    heroCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        border: '1px solid rgba(49, 112, 205, 0.18)',
        padding: '28px 28px 26px',
        boxShadow: '0 18px 45px rgba(31, 79, 145, 0.08)',
    },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 999,
        backgroundColor: '#d7e6fb',
        color: '#1f4f91',
        fontWeight: 800,
        fontSize: 14,
        marginBottom: 14,
    },
    heroHeading: {
        fontSize: 46,
        fontWeight: 800,
        color: '#112e51',
        margin: '0 0 12px',
        lineHeight: 1.02,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#4a6078',
        margin: '0 0 20px',
        lineHeight: 1.6,
    },
    bodyText: {
        fontSize: 15.5,
        color: '#34485b',
        lineHeight: 1.75,
        maxWidth: 760,
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 18,
    },
    infoCard: {
        borderRadius: 18,
        padding: '18px 22px',
        minHeight: 90,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 8,
    },
    infoCardPrimary: {
        backgroundColor: '#eef5fd',
        border: '1px solid rgba(31, 79, 145, 0.18)',
    },
    infoCardLight: {
        backgroundColor: '#f7fbff',
        border: '1px solid rgba(79, 143, 232, 0.18)',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: '#11386e',
        margin: 0,
    },
    buttonRow: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: 8,
    },
    ctaButton: {
        padding: '14px 30px',
        borderRadius: 999,
        border: 'none',
        backgroundColor: '#1f4f91',
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 12px 24px rgba(31, 79, 145, 0.18)',
    },
};
