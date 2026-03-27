import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { COMMANDS } from '../constants/commands';
import { saveVoiceProfile } from '../services/supabaseClient';
import { extractFeatures } from '../utils/audioFingerprint';

// ─── Constants ───────────────────────────────────────────────────────────────
const RECORD_DURATION_MS = 3000;  // mic stays open for 3 seconds per command
const COUNTDOWN_START    = 3;

// ─── Audio path builders ─────────────────────────────────────────────────────
// English: /audio/intro_en.mp3, /audio/cmd_1_stop.mp3, ...
// Tamil  : /audio/intro_ta.mp3, /audio/cmd_1_stop_ta.mp3, ...
const introAudio = (lang) =>
  lang === 'ta' ? '/audio/intro_ta.mp3' : '/audio/intro_en.mp3';

const cmdAudio = (cmd, lang) =>
  lang === 'ta'
    ? cmd.audioFile.replace('.mp3', '_ta.mp3')   // e.g. cmd_1_stop_ta.mp3
    : cmd.audioFile;                              // e.g. cmd_1_stop.mp3

// ─── Helpers ─────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const recordForDuration = (stream, ms) =>
  new Promise((resolve) => {
    const recorder = new MediaRecorder(stream);
    const chunks   = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop          = ()  => resolve(new Blob(chunks, { type: 'audio/webm' }));
    recorder.start();
    setTimeout(() => recorder.stop(), ms);
  });

const playAudioFile = (src) =>
  new Promise((resolve) => {
    const a   = new Audio(src);
    a.onended = resolve;
    a.onerror = () => { console.warn('[audio] missing, skipping:', src); resolve(); };
    a.play().catch(() => resolve());
  });

// ─── Component ───────────────────────────────────────────────────────────────
export default function InstructionsPage() {
  const navigate    = useNavigate();
  const { student } = useStudent();

  // Phases: LANGUAGE_SELECT → AUDIO → COUNTDOWN → RECORDING → DONE
  const [phase, setPhase]                       = useState('LANGUAGE_SELECT');
  const [lang, setLang]                         = useState(null);          // 'en' | 'ta'
  const [countdown, setCountdown]               = useState(null);
  const [currentIdx, setCurrentIdx]             = useState(0);
  const [cmdPhase, setCmdPhase]                 = useState('idle');        // 'playing' | 'recording' | 'saved'
  const [savedCommands, setSavedCommands]       = useState([]);
  const [statusMsg, setStatusMsg]               = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const streamRef = useRef(null);
  const tickRef   = useRef(null);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(tickRef.current);
  }, []);

  // ── Mic helper ──────────────────────────────────────────────────────────
  const getMicStream = async () => {
    if (streamRef.current) return streamRef.current;
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = s;
    return s;
  };
  const stopMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // ── PHASE: AUDIO ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'AUDIO') return;
    (async () => {
      setStatusMsg(lang === 'ta' ? 'அறிமுக ஆடியோ இயக்கப்படுகிறது…' : 'Playing introduction audio…');
      await playAudioFile(introAudio(lang));
      setPhase('COUNTDOWN');
    })();
  }, [phase, lang]);

  // ── PHASE: COUNTDOWN ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'COUNTDOWN') return;
    (async () => {
      for (let i = COUNTDOWN_START; i >= 1; i--) {
        setCountdown(i);
        setStatusMsg(lang === 'ta' ? `⏳ ${i} வினாடியில் தொடங்குகிறது…` : `⏳ Recording starts in ${i}…`);
        await delay(1000);
      }
      setCountdown(0);
      setPhase('RECORDING');
    })();
  }, [phase, lang]);

  // ── PHASE: RECORDING ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'RECORDING') return;
    captureCommand(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Record each command ──────────────────────────────────────────────────
  const captureCommand = async (idx) => {
    if (idx >= COMMANDS.length) {
      stopMic();
      setPhase('DONE');
      setStatusMsg(lang === 'ta'
        ? '✅ அனைத்து கட்டளைகளும் சேமிக்கப்பட்டன! தேர்வுக்கு செல்கிறோம்…'
        : '✅ All 10 commands saved! Entering exam…');
      await delay(1500);
      navigate('/exam');
      return;
    }

    const cmd  = COMMANDS[idx];
    const src  = cmdAudio(cmd, lang);

    setCurrentIdx(idx);
    setCmdPhase('playing');
    setStatusMsg(lang === 'ta' ? `🔊 கேளுங்கள்: "${cmd.command}"` : `🔊 Listen: "${cmd.command}"`);

    // 1️⃣ Play command audio
    await playAudioFile(src);

    // 2️⃣ Brief pause
    await delay(400);

    // 3️⃣ Auto-enable mic & record for 3 seconds
    setCmdPhase('recording');
    setRecordingSeconds(3);
    setStatusMsg(lang === 'ta'
      ? `🔴 மைக் ON — "${cmd.command}" சொல்லுங்கள்!`
      : `🔴 Mic ON — say "${cmd.command}" now!`);

    let t = 3;
    tickRef.current = setInterval(() => {
      t -= 1;
      setRecordingSeconds(t > 0 ? t : 0);
    }, 1000);

    try {
      const stream = await getMicStream();
      const blob   = await recordForDuration(stream, RECORD_DURATION_MS);

      clearInterval(tickRef.current);
      setCmdPhase('saved');
      setStatusMsg(lang === 'ta' ? `✅ சேமிக்கப்பட்டது: "${cmd.command}"` : `✅ Saved: "${cmd.command}"`);
      setSavedCommands((prev) => [...prev, cmd.command]);

      // 4️⃣ Extract voice biometric features then upload to Supabase (non-blocking)
      extractFeatures(blob)
        .then((features) =>
          saveVoiceProfile(student?.registerNo, student?.name, idx, cmd.command, blob, features)
        )
        .catch((err) => {
          console.error('Feature extraction error:', err);
          // Save blob anyway without features
          saveVoiceProfile(student?.registerNo, student?.name, idx, cmd.command, blob, null);
        });

      await delay(700);
      captureCommand(idx + 1);
    } catch (err) {
      clearInterval(tickRef.current);
      console.error('Recording error:', err);
      setCmdPhase('idle');
      setStatusMsg(lang === 'ta' ? '⚠️ மைக் பிழை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.' : '⚠️ Mic error. Please allow mic access and refresh.');
    }
  };

  const progress = (savedCommands.length / COMMANDS.length) * 100;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>

      {/* Header */}
      <div style={S.header}>
        <span>Swayam Lekh — Voice Setup</span>
        <div style={S.headerRight}>
          <span>Reg: <strong>{student?.registerNo}</strong></span>
          <span>Name: <strong>{student?.name}</strong></span>
          {lang && (
            <span style={{ backgroundColor: '#2980b9', padding: '2px 10px', borderRadius: 3 }}>
              {lang === 'ta' ? '🇮🇳 Tamil' : '🇬🇧 English'}
            </span>
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
                onClick={() => { setLang('en'); setPhase('AUDIO'); }}
              />
              <LangButton
                flag="🇮🇳"
                label="தமிழ்"
                onClick={() => { setLang('ta'); setPhase('AUDIO'); }}
              />
            </div>
          </div>
        )}

        {/* ══ AUDIO phase ══════════════════════════════════════════ */}
        {phase === 'AUDIO' && (
          <div style={{ ...S.card, textAlign: 'center', padding: '52px 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔊</div>
            <h2 style={S.title}>
              {lang === 'ta' ? 'அறிமுக ஆடியோ இயக்கப்படுகிறது' : 'Playing Introduction Audio'}
            </h2>
            <p style={{ ...S.sub, marginTop: 8 }}>{statusMsg}</p>
            <p style={{ marginTop: 28, fontSize: 13, color: '#aaa' }}>
              {lang === 'ta'
                ? 'ஆடியோ முடிந்தவுடன் மைக் தானாக இயங்கும்…'
                : 'Microphone activates automatically after audio finishes…'}
            </p>
          </div>
        )}

        {/* ══ COUNTDOWN phase ══════════════════════════════════════ */}
        {phase === 'COUNTDOWN' && (
          <div style={{ ...S.card, textAlign: 'center', padding: '52px 40px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
            <h2 style={S.title}>{lang === 'ta' ? 'தயாராகுங்கள்!' : 'Get Ready!'}</h2>
            <p style={S.sub}>
              {lang === 'ta'
                ? 'ஒவ்வொரு கட்டளையும் கேட்டு, மைக்கில் சொல்லுங்கள்.'
                : 'Listen to each command — then repeat it back into the mic.'}
            </p>
            <div style={S.bigRing}>
              <span style={{ fontSize: 48, fontWeight: 900, color: '#1a5276' }}>{countdown}</span>
            </div>
          </div>
        )}

        {/* ══ RECORDING / DONE phase ═══════════════════════════════ */}
        {(phase === 'RECORDING' || phase === 'DONE') && (
          <div style={S.recordWrap}>

            {/* Card header + progress */}
            <div style={S.recordHeader}>
              <h2 style={{ ...S.title, marginBottom: 4 }}>🎙️ {lang === 'ta' ? 'குரல் கட்டளை பதிவு' : 'Voice Command Registration'}</h2>
              <p style={S.sub}>
                {lang === 'ta'
                  ? 'ஒவ்வொரு கட்டளை ஆடியோவும் கேட்டு, சிவப்பு LED எரியும்போது சொல்லுங்கள்.'
                  : 'Listen to each command audio, then speak when the red indicator appears.'}
              </p>
              <div style={{ marginTop: 16 }}>
                <div style={S.progLabel}>
                  <span>{savedCommands.length} / {COMMANDS.length} {lang === 'ta' ? 'சேமிக்கப்பட்டன' : 'saved'}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div style={S.track}>
                  <div style={{ ...S.fill, width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* Command rows */}
            <div style={S.cmdList}>
              {COMMANDS.map((cmd, idx) => {
                const isSaved   = savedCommands.includes(cmd.command);
                const isCurrent = idx === currentIdx && !isSaved;
                const isRec     = isCurrent && cmdPhase === 'recording';
                const isPlay    = isCurrent && cmdPhase === 'playing';

                const border = isRec ? '#e74c3c' : isPlay ? '#e67e22' : isSaved ? '#27ae60' : isCurrent ? '#2980b9' : '#e8e8e8';
                const bg     = isRec ? '#fdecea' : isPlay ? '#fef9ec' : isSaved ? '#eafaf1' : isCurrent ? '#eaf4fb' : '#fafafa';
                const icon   = isRec ? '🔴' : isPlay ? '🔊' : isSaved ? '✅' : isCurrent ? '👉' : '⬜';

                return (
                  <div key={cmd.command} style={{ padding: '14px 20px', border: `2px solid ${border}`, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.25s' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#bbb', marginBottom: 2 }}>
                        Command {idx + 1} · <span style={{ textTransform: 'capitalize' }}>{cmd.category.replace('_', ' ')}</span>
                      </div>
                      <code style={{ fontSize: 15, fontWeight: 'bold', color: isCurrent ? '#1a3a5c' : '#333' }}>
                        {icon}&nbsp;&nbsp;&quot;{cmd.command}&quot;
                      </code>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{cmd.description}</p>
                    </div>
                    <div style={{ minWidth: 72, textAlign: 'right' }}>
                      {isSaved && <span style={{ fontSize: 11, fontWeight: 'bold', color: '#27ae60' }}>SAVED</span>}
                      {isPlay  && <span style={{ fontSize: 11, fontWeight: 'bold', color: '#e67e22' }}>▶ PLAYING</span>}
                      {isRec   && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={S.recDot} />
                          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#e74c3c', marginTop: 2 }}>{recordingSeconds}s</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status */}
            <div style={S.statusBar}>{statusMsg}</div>
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
  header:      { height: 52, backgroundColor: '#1a3a5c', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 14, fontWeight: 'bold', flexShrink: 0 },
  headerRight: { marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, opacity: 0.9, alignItems: 'center' },
  wrap:        { maxWidth: 860, margin: '32px auto', width: '100%', padding: '0 20px' },
  card:        { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8 },
  title:       { fontSize: 22, fontWeight: 'bold', color: '#1a3a5c', margin: '0 0 6px' },
  sub:         { fontSize: 14, color: '#555', margin: 0 },
  bigRing:     { width: 110, height: 110, borderRadius: '50%', border: '6px solid #1a5276', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '28px auto 0', boxShadow: '0 0 0 10px rgba(26,82,118,0.08)' },
  recordWrap:  { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' },
  recordHeader:{ padding: '28px 28px 20px' },
  progLabel:   { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 6 },
  track:       { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  fill:        { height: '100%', backgroundColor: '#1a5276', borderRadius: 4, transition: 'width 0.4s ease' },
  cmdList:     { display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid #eee' },
  statusBar:   { padding: '16px 28px', backgroundColor: '#eaf4fb', borderTop: '1px solid #aed6f1', fontSize: 14, fontWeight: 'bold', color: '#1a5276' },
  recDot:      { width: 10, height: 10, borderRadius: '50%', backgroundColor: '#e74c3c', margin: '0 auto' },
};