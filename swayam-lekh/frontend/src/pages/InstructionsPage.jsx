import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { COMMANDS } from '../constants/commands';
import { countApproxCommandOccurrences } from '../utils/voiceCommandDetection';

// ─── Constants ───────────────────────────────────────────────────────────────
const BETWEEN_AUDIO_GAP_MS = 2000; // 2-second gap between command audios
const NEXT_ROUTE = '/voice-setup';  // after instructions → voice recording page

// ─── Audio path builders ─────────────────────────────────────────────────────
const introAudio = (lang) =>
  lang === 'ta' ? '/audio/intro_ta.mp3' : '/audio/intro_en.mp3';

const cmdAudio = (cmd, lang) =>
  !cmd?.audioFile
    ? null
    : lang === 'ta'
      ? cmd.audioFile.replace('.mp3', '_ta.mp3')
      : cmd.audioFile;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const playAudioFile = (src, audioRef) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(true);
      return;
    }
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    const a = new Audio(src);
    if (audioRef) audioRef.current = a;
    a.onended = () => done(true);
    a.onerror = () => { console.warn('[audio] missing, skipping:', src); done(true); };
    a.play().catch(() => done(false));
  });

// ─── Component ───────────────────────────────────────────────────────────────
export default function InstructionsPage() {
  const navigate    = useNavigate();
  const { student, updateStudent } = useStudent();

  // Phases: LANGUAGE_SELECT → PLAYING → DONE
  const [phase, setPhase]           = useState('LANGUAGE_SELECT');
  const [lang, setLang]             = useState(null);     // 'en' | 'ta'
  const [currentIdx, setCurrentIdx] = useState(-1);       // which command audio is playing
  const [statusMsg, setStatusMsg]   = useState('');
  const [skipTriggered, setSkipTriggered] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const handleLanguagePick = useCallback((selectedLang) => {
    setLang(selectedLang);
    setPhase('PLAYING');
    updateStudent({ instructionLang: selectedLang });
  }, [updateStudent]);


  // refs
  const abortRef     = useRef(false);   // set to true when skip navigates away / unmounts
  const navigatedRef = useRef(false);   // prevent double navigator push
  const srRef        = useRef(null);    // SpeechRecognition instance
  const hoverSkip    = useRef(false);
  const currentAudioRef = useRef(null); // track currently playing audio

  // ── Navigate to voice-setup page ────────────────────────────────────────
  const goToNext = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    abortRef.current = true;
    
    // Stop currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    
    // Stop speech recognition
    try { srRef.current?.stop(); } catch (_) {}
    navigate(NEXT_ROUTE, { state: { lang, subjectMode: student?.subjectMode } });
  }, [navigate, lang, student?.subjectMode]);

  // ── Start background SKIP SKIP detection ────────────────────────────────
  // skipCountRef persists across SR session restarts so each "skip"
  // heard in ANY session adds to the running total.
  const skipCountRef = useRef(0);

  const startSkipListener = useCallback(() => {
    if (!lang) return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMsg('Speech recognition not supported in this browser. Use Chrome or Edge, or click Skip Instructions.');
      return;
    }

    skipCountRef.current = 0;   // reset counter for this listener session

    const sr = new SpeechRecognition();
    sr.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    sr.continuous = true;
    sr.interimResults = true;

    let sessionSkips = 0;  // skips counted in this current SR session

    sr.onresult = (e) => {
      if (abortRef.current) return;
      // Ignore recognizer text while app audio is actively playing.
      if (currentAudioRef.current && !currentAudioRef.current.paused) return;

      // Combine all results (final + interim) for this session
      const sessionText = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .toLowerCase();

      // Count occurrences in the current session (very lenient check for mispronunciations)
      sessionSkips = countApproxCommandOccurrences(
        sessionText,
        'skip',
        ['skip', 'skips', 'keep', 'skep', 'scape', 'skeep', 'step', 'scip'],
      );
      
      const totalSkips = skipCountRef.current + sessionSkips;

      console.log(`[skip-listener] heard: "${sessionText.slice(-60)}" → total skips: ${totalSkips}`);

      // Require at least 2 matches to reduce accidental trigger from ambient speech.
      if (totalSkips >= 2) {
        setSkipTriggered(true);
        setStatusMsg('🎤 "SKIP" detected — redirecting…');
        abortRef.current = true;   // prevent any audio restart
        setTimeout(goToNext, 500);
      }
    };

    sr.onerror = (e) => {
      if (e.error === 'audio-capture') {
        setStatusMsg('Microphone not detected. Check mic connection/permissions, then click Skip Instructions.');
        return;
      }
      if (e.error === 'not-allowed') return;
      if (!abortRef.current) {
        skipCountRef.current += sessionSkips;  // commit the skips we heard in this session
        sessionSkips = 0;
        try { sr.start(); } catch (_) {}
      }
    };

    sr.onend = () => {
      if (!abortRef.current) {
        skipCountRef.current += sessionSkips;  // commit the skips we heard in this session
        sessionSkips = 0;
        try { sr.start(); } catch (_) {}
      }
    };

    srRef.current = sr;
    try { sr.start(); } catch (_) {}
  }, [goToNext, lang]);

  const ensureMicPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMsg('Microphone is not supported in this browser.');
      setMicReady(false);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicReady(true);
      return true;
    } catch (err) {
      setMicReady(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setStatusMsg('Microphone permission denied. Allow mic access in browser settings or click Skip Instructions.');
      } else {
        setStatusMsg('Microphone not detected. Check device and permissions, or click Skip Instructions.');
      }
      return false;
    }
  }, []);

  // ── PHASE: PLAYING ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    abortRef.current = false;
    setAudioBlocked(false);

    const run = async () => {
      // 1️⃣ Play intro audio
      setStatusMsg(lang === 'ta' ? 'அறிமுக ஆடியோ இயக்கப்படுகிறது…' : 'Playing introduction audio…');
      const introOk = await playAudioFile(introAudio(lang), currentAudioRef);
      if (!introOk) {
        setAudioBlocked(true);
        setStatusMsg(lang === 'ta' ? '🔈 ஆடியோ தடைப்பட்டது. Start Audio அழுத்தவும்.' : '🔈 Audio was blocked by browser. Click Start Audio.');
        return;
      }
      if (abortRef.current) return;

      await delay(BETWEEN_AUDIO_GAP_MS);
      if (abortRef.current) return;

      // 2️⃣ Play each command audio with 2s gap — NO MIC, NO RECORDING
      for (let idx = 0; idx < COMMANDS.length; idx++) {
        if (abortRef.current) return;

        const cmd = COMMANDS[idx];
        const src = cmdAudio(cmd, lang);

        setCurrentIdx(idx);
        setStatusMsg(
          lang === 'ta'
            ? `🔊 ${idx + 1}/${COMMANDS.length} கட்டளை: "${cmd.command}"`
            : `🔊 Command ${idx + 1}/${COMMANDS.length}: "${cmd.command}"`
        );

        await playAudioFile(src, currentAudioRef);
        if (abortRef.current) return;

        // 2-second gap between commands (no recording)
        await delay(BETWEEN_AUDIO_GAP_MS);
        if (abortRef.current) return;
      }

      // 3️⃣ All done — auto-navigate
      setPhase('DONE');
      setStatusMsg(
        lang === 'ta'
          ? '✅ அனைத்து கட்டளைகளும் இயக்கப்பட்டன! அடுத்த பக்கத்திற்கு செல்கிறோம்…'
          : '✅ All commands played! Proceeding to voice setup…'
      );
      await delay(1200);
      goToNext();
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, playbackAttempt, lang]);

  // ── Start skip listener once language is chosen ──────────────────────────
  useEffect(() => {
    if (phase === 'PLAYING') {
      ensureMicPermission().then((ok) => {
        if (ok && !abortRef.current) startSkipListener();
      });
    }
    return () => {
      // cleanup on unmount
      try { srRef.current?.stop(); } catch (_) {}
    };
  }, [phase, startSkipListener, ensureMicPermission]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      try { srRef.current?.stop(); } catch (_) {}
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>

      {/* Header */}
      <div style={S.header}>
        <span>Swayam Lekh — Instructions</span>
        <div style={S.headerRight}>
          <span>Reg: <strong>{student?.registerNo}</strong></span>
          <span>Name: <strong>{student?.name}</strong></span>
          {lang && (
            <span style={{ backgroundColor: '#2980b9', padding: '2px 10px', borderRadius: 3 }}>
              {lang === 'ta' ? '🇮🇳 Tamil' : '🇬🇧 English'}
            </span>
          )}
          {/* Always-visible Skip button (except on language select) */}
          {phase === 'PLAYING' && (
            <button
              onClick={goToNext}
              onMouseEnter={() => { hoverSkip.current = true; }}
              onMouseLeave={() => { hoverSkip.current = false; }}
              style={S.skipBtn}
            >
              Skip Instructions →
            </button>
          )}
        </div>
      </div>

      <div style={S.wrap}>

        {/* ══ LANGUAGE SELECT ══════════════════════════════════════ */}
        {phase === 'LANGUAGE_SELECT' && (
          <div style={{ ...S.card, textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🌐</div>
            <h2 style={S.title}>Choose Your Language</h2>
            <p style={{ ...S.sub, marginBottom: 8 }}>தமிழ் / English</p>
            <p style={{ fontSize: 13, color: '#999', marginBottom: 36 }}>
              Select the language for instructions and command audio.
            </p>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
              <LangButton
                flag="🇬🇧"
                label="English"
                onClick={() => handleLanguagePick('en')}
              />
              <LangButton
                flag="🇮🇳"
                label="தமிழ்"
                onClick={() => handleLanguagePick('ta')}
              />
            </div>
          </div>
        )}

        {/* ══ PLAYING phase ════════════════════════════════════════ */}
        {phase === 'PLAYING' && (
          <div style={S.recordWrap}>

            {/* Card header */}
            <div style={S.recordHeader}>
              <h2 style={{ ...S.title, marginBottom: 4 }}>
                🔊 {lang === 'ta' ? 'கட்டளை ஆடியோக்கள் இயக்கப்படுகின்றன' : 'Playing Command Audio Instructions'}
              </h2>
              <p style={S.sub}>
                {lang === 'ta'
                  ? 'ஒவ்வொரு கட்டளையையும் கவனமாகக் கேளுங்கள். மைக் பதிவு இல்லை.'
                  : 'Listen carefully to each command. No mic recording on this page.'}
              </p>

              {/* Skip hint */}
              <div style={S.skipHint}>
                💡 {lang === 'ta'
                  ? '"SKIP SKIP" என்று சொல்லுங்கள் அல்லது மேலே உள்ள Skip பட்டனை அழுத்துங்கள்'
                  : 'Say "SKIP SKIP" or click the Skip button above to proceed'}
              </div>
              {audioBlocked && (
                <button
                  onClick={() => setPlaybackAttempt((v) => v + 1)}
                  style={{
                    marginTop: 10,
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#1a3a5c',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'ta' ? '▶ Start Audio' : '▶ Start Audio'}
                </button>
              )}
              {!micReady && (
                <div style={{ ...S.skipHint, marginTop: 8, backgroundColor: '#fff6e5', color: '#9a6700', border: '1px solid #f6d592' }}>
                  {lang === 'ta'
                    ? '🎤 மைக்ரோஃபோன் அனுமதி இல்லையெனில், குரல் மூலம் SKIP வேலை செய்யாமல் இருக்கலாம்.'
                    : '🎤 If microphone permission is blocked, voice SKIP may not work.'}
                </div>
              )}
            </div>

            {/* Command rows — audio-only, no recording UI */}
            <div style={S.cmdList}>
              {COMMANDS.map((cmd, idx) => {
                const isPlaying = idx === currentIdx;
                const isDone    = idx < currentIdx;

                const border = isPlaying ? '#e67e22' : isDone ? '#27ae60' : '#e8e8e8';
                const bg     = isPlaying ? '#fef9ec' : isDone ? '#eafaf1' : '#fafafa';
                const icon   = isPlaying ? '🔊' : isDone ? '✅' : '⬜';

                return (
                  <div
                    key={cmd.command}
                    style={{
                      padding: '14px 20px',
                      border: `2px solid ${border}`,
                      backgroundColor: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.3s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: '#bbb', marginBottom: 2 }}>
                        Command {idx + 1} ·{' '}
                        <span style={{ textTransform: 'capitalize' }}>
                          {cmd.category.replace('_', ' ')}
                        </span>
                      </div>
                      <code style={{ fontSize: 15, fontWeight: 'bold', color: isPlaying ? '#b7770d' : isDone ? '#1e8449' : '#333' }}>
                        {icon}&nbsp;&nbsp;&quot;{cmd.command}&quot;
                      </code>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{cmd.description}</p>
                    </div>
                    <div style={{ minWidth: 80, textAlign: 'right' }}>
                      {isPlaying && (
                        <span style={{ fontSize: 11, fontWeight: 'bold', color: '#e67e22' }}>
                          ▶ PLAYING
                        </span>
                      )}
                      {isDone && (
                        <span style={{ fontSize: 11, fontWeight: 'bold', color: '#27ae60' }}>
                          DONE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status bar */}
            <div style={S.statusBar}>{statusMsg}</div>
          </div>
        )}

        {/* ══ DONE phase ═══════════════════════════════════════════ */}
        {phase === 'DONE' && (
          <div style={{ ...S.card, textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={S.title}>
              {lang === 'ta' ? 'அனைத்தும் முடிந்தது!' : 'All Done!'}
            </h2>
            <p style={S.sub}>{statusMsg}</p>
          </div>
        )}

        {/* ══ Skip-triggered overlay hint ══════════════════════════ */}
        {skipTriggered && (
          <div style={S.skipOverlay}>
            🎤 <strong>"SKIP SKIP"</strong> detected — navigating…
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function LangButton({ flag, label, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '20px 40px',
        fontSize: 18,
        fontWeight: 'bold',
        borderRadius: 8,
        border: `2px solid ${hov ? '#1a5276' : '#ccc'}`,
        backgroundColor: hov ? '#1a5276' : '#fff',
        color: hov ? '#fff' : '#333',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: 140,
      }}
    >
      <span style={{ fontSize: 32 }}>{flag}</span>
      {label}
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  root:        { minHeight: '100vh', backgroundColor: '#f2f4f7', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' },
  header:      { height: 52, backgroundColor: '#1a3a5c', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 14, fontWeight: 'bold', flexShrink: 0, gap: 12 },
  headerRight: { marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, opacity: 0.9, alignItems: 'center' },
  wrap:        { maxWidth: 860, margin: '32px auto', width: '100%', padding: '0 20px' },
  card:        { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8 },
  title:       { fontSize: 22, fontWeight: 'bold', color: '#1a3a5c', margin: '0 0 6px' },
  sub:         { fontSize: 14, color: '#555', margin: 0 },
  recordWrap:  { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' },
  recordHeader:{ padding: '28px 28px 20px' },
  cmdList:     { display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid #eee' },
  statusBar:   { padding: '16px 28px', backgroundColor: '#eaf4fb', borderTop: '1px solid #aed6f1', fontSize: 14, fontWeight: 'bold', color: '#1a5276' },
  skipBtn:     { backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap' },
  skipHint:    { marginTop: 14, padding: '10px 16px', backgroundColor: '#fffbe6', border: '1px solid #f0c040', borderRadius: 6, fontSize: 13, color: '#7a6000' },
  skipOverlay: { position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a3a5c', color: '#fff', padding: '12px 28px', borderRadius: 8, fontSize: 15, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
};