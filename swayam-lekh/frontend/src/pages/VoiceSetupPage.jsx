import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { saveVoiceProfile } from '../services/supabaseClient';
import { countApproxCommandOccurrences } from '../utils/voiceCommandDetection';

// ─── Constants ────────────────────────────────────────────────────────────────
const VISUALIZER_BARS = 32;
const NEXT_ROUTE      = '/exam';
const REG_DIGIT_COUNT = 8;

// ─── Digit word map ───────────────────────────────────────────────────────────
const WORD_DIGIT = {
  zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
  'no':0, 'to':2, 'for':4, 'ate':8, 'nino':9, 'won':1, 'tu':2,
};

function extractDigits(text) {
  const lower = (text || '').toLowerCase().trim();
  const numeric = lower.match(/\d/g);
  if (numeric) return numeric.map(Number);
  const digits = [];
  for (const w of lower.split(/\s+/)) {
    if (w in WORD_DIGIT) digits.push(WORD_DIGIT[w]);
  }
  return digits;
}

// ─── Audio helper — resolves only when audio ENDS (or errors) ─────────────────
function playAudioFull(src) {
  return new Promise((resolve) => {
    const a = new Audio(src);
    a.onended = () => resolve({ ok: true });
    a.onerror = () => resolve({ ok: false });
    a.play().catch(() => resolve({ ok: false, blocked: true }));
  });
}

// ─── Audio helper — resolves as soon as it STARTS (non-blocking) ──────────────
function playAudioStart(src) {
  return new Promise((resolve) => {
    const a = new Audio(src);
    a.onerror   = () => resolve({ ok: false, blocked: false, el: a });
    a.onplaying = () => resolve({ ok: true,  blocked: false, el: a });
    a.play().catch(() => resolve({ ok: false, blocked: true, el: a }));
    setTimeout(() => resolve({ ok: true, blocked: false, el: a }), 1500);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoiceSetupPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { student } = useStudent();

  const lang          = location.state?.lang || student?.instructionLang || 'en';
  const subjectMode   = location.state?.subjectMode || student?.subjectMode || 'normal';
  const introAudioSrc = lang === 'ta' ? '/audio/voice_setup_ta.mp3'     : '/audio/voice_setup_en.mp3';
  const endAudioSrc   = lang === 'ta' ? '/audio/voice_setup_end_ta.mp3' : '/audio/voice_setup_end_en.mp3';

  // ── Task definitions ──────────────────────────────────────────────────────
  const tasks = useMemo(() => [
    {
      id: 'stop',
      label: 'Say "STOP" three times',
      hint: 'Speak the word STOP three times clearly',
      // Web Speech often drops repeated words; treat two clear STOPs as a pass.
      detect: (t) => countApproxCommandOccurrences(t, 'stop', ['stop', 'stoop', 'stopp', 'top', 'cop', 'shtop', 'estop']) >= 2,
    },
    {
      id: 'name',
      label: 'Say your name',
      hint: 'Speak your full name once clearly',
      detect: (t) => {
        const words = (t || '')
          .toLowerCase()
          .replace(/[^a-z\s]/g, ' ')
          .split(/\s+/)
          .filter(Boolean);
        const nonStopWords = words.filter((w) => w !== 'stop');
        return nonStopWords.length >= 1 && nonStopWords.join('').length >= 2;
      },
    },
    {
      id: 'regno',
      label: 'Say your 8-digit Registration Number',
      hint: `Say all 8 digits: ${(student?.registerNo || '????????').split('').join('  ')}`,
      detect: (t) => extractDigits(t).length >= REG_DIGIT_COUNT,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [subjectMode]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState('INTRO');  // INTRO | WAITING | LISTENING | ALLBEST | DONE
  const [statusMsg, setStatusMsg]   = useState('Playing introduction audio…');
  const [bars, setBars]             = useState(Array(VISUALIZER_BARS).fill(0));
  const [taskDone, setTaskDone]     = useState([false, false, false]);
  const [taskText, setTaskText]     = useState(['', '', '']);
  const [activeTask, setActiveTask] = useState(0);
  const [lastTranscript, setLastTranscript] = useState('');
  const [blocked, setBlocked]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');

  // ── Refs ──────────────────────────────────────────────────────────────────
  const dead         = useRef(false);
  const streamRef    = useRef(null);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const analyserRef  = useRef(null);
  const rafRef       = useRef(null);
  const srRef        = useRef(null);
  const activeIdxRef = useRef(0);
  const taskDoneRef  = useRef([false, false, false]);
  const blockedAudio = useRef(null);
  const srStarted    = useRef(false);  // guard to prevent SR from being started before intro ends

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    dead.current = true;
    cancelAnimationFrame(rafRef.current);
    try { srRef.current?.stop(); } catch (_) {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // ── Visualiser (single muted colour — no colour gradient) ─────────────────
  function drawBars() {
    rafRef.current = requestAnimationFrame(drawBars);
    const an = analyserRef.current;
    if (!an) return;
    const data = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(data);
    const step = Math.floor(data.length / VISUALIZER_BARS);
    const vals = Array.from({ length: VISUALIZER_BARS }, (_, i) => {
      const slice = data.slice(i * step, (i + 1) * step);
      return slice.reduce((s, v) => s + v, 0) / (slice.length * 255);
    });
    setBars(vals);
  }

  // ── Upload blob ───────────────────────────────────────────────────────────
  async function uploadBlob(idx, blob, transcript) {
    setSaving(true);
    try {
      // Pass the actual transcript (or task ID + transcript) for database recording
      const dbText = `[${tasks[idx].id}] ${transcript}`;
      await saveVoiceProfile(student?.registerNo, student?.name, idx, dbText, blob, null);
      setSaveMsg('Saved ✓');
    } catch {
      setSaveMsg('Save failed');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 2500);
  }

  // ── Stop recorder → blob ──────────────────────────────────────────────────
  function stopRecorder() {
    return new Promise((res) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        res(new Blob(chunksRef.current, { type: 'audio/webm' }));
        return;
      }
      rec.onstop = () => res(new Blob(chunksRef.current, { type: 'audio/webm' }));
      rec.stop();
    });
  }

  // ── Start recorder ────────────────────────────────────────────────────────
  function startRecorder(stream) {
    chunksRef.current = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorderRef.current = rec;
    rec.start(100);
  }

  // ── Task completed ────────────────────────────────────────────────────────
  async function completeTask(idx, transcript) {
    console.log('[task] completeTask called for idx=', idx, 'transcript=', transcript);
    if (dead.current || taskDoneRef.current[idx]) {
      console.log('[task] skipping - dead or already done');
      return;
    }

    taskDoneRef.current[idx] = true;
    setTaskDone([...taskDoneRef.current]);
    setTaskText((prev) => { const n = [...prev]; n[idx] = transcript; return n; });

    const blob = await stopRecorder();
    uploadBlob(idx, blob, transcript);

    const nextIdx = idx + 1;
    if (nextIdx >= tasks.length) {
      // ── All tasks done ──────────────────────────────────────────────────
      console.log('[task] all tasks completed!');
      dead.current = true;
      try { srRef.current?.stop(); } catch (_) {}
      cancelAnimationFrame(rafRef.current);
      setBars(Array(VISUALIZER_BARS).fill(0));

      // Show "All the Best" inline, play end audio, then navigate
      setPhase('ALLBEST');
      setStatusMsg('Playing completion audio…');
      await playAudioFull(endAudioSrc);
      setPhase('DONE');
      setTimeout(() => navigate(NEXT_ROUTE), 1200);
    } else {
      console.log('[task] moving to next task:', nextIdx);
      activeIdxRef.current = nextIdx;
      setActiveTask(nextIdx);
      setStatusMsg(`Step ${nextIdx + 1} of ${tasks.length} — speak now`);
      startRecorder(streamRef.current);
    }
  }

  // ── Speech Recognition — called only after intro audio ends ───────────────
  function startSR() {
    if (srStarted.current) return;
    srStarted.current = true;

    console.log('[SR] startSR called, lang=', lang);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { 
      console.error('[SR] Speech Recognition API not supported');
      setStatusMsg('⚠️ Speech recognition not supported. Use Chrome.'); 
      return; 
    }

    const sr = new SR();
    const srLang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    sr.lang = srLang;
    sr.continuous = true;
    sr.interimResults = true;
    
    console.log('[SR] initialized with lang:', srLang);

    sr.onstart = () => {
      console.log('[SR] onstart - speech recognition started');
    };

    sr.onresult = (e) => {
      if (dead.current) return;
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      const isFinal = Array.from(e.results).map((r) => r.isFinal);
      console.log('[SR] onresult:', { transcript, isFinal: isFinal[isFinal.length - 1], resultsCount: e.results.length });
      setLastTranscript(transcript);

      const idx = activeIdxRef.current;
      if (taskDoneRef.current[idx]) {
        console.log('[SR] task already done, skipping detection');
        return;
      }

      console.log('[SR] checking detection for task:', tasks[idx].id, 'transcript:', transcript);
      // Run detection on interim + final so we react immediately when the phrase is heard
      const detected = tasks[idx].detect(transcript);
      console.log('[SR] detection result:', detected);
      if (detected) {
        console.log('[SR] DETECTED! Completing task:', tasks[idx].id);
        completeTask(idx, transcript);
      }
    };

    sr.onerror = (e) => {
      console.error('[SR] onerror:', e.error);
      if (e.error === 'not-allowed') { 
        console.error('[SR] Microphone permission denied');
        setStatusMsg('⚠️ Mic blocked by browser.'); 
        return; 
      }
      if (!dead.current) { 
        console.log('[SR] restarting after error...');
        try { sr.start(); } catch (_) {} 
      }
    };

    sr.onend = () => { 
      console.log('[SR] onend - speech recognition ended');
      if (!dead.current) { 
        console.log('[SR] restarting...');
        try { sr.start(); } catch (_) {} 
      } 
    };

    srRef.current = sr;
    try { 
      sr.start();
      console.log('[SR] start() called successfully');
    } catch (err) {
      console.error('[SR] failed to start:', err);
    }
  }

  // ── Enable mic + visualiser only (no SR yet — wait for intro to end) ──────
  async function startMicOnly() {
    if (dead.current) return false;
    try {
      console.log('[mic] requesting microphone access...');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('NOT_SUPPORTED');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[mic] stream acquired:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      if (dead.current) { stream.getTracks().forEach((t) => t.stop()); return false; }
      streamRef.current = stream;

      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[mic] AudioContext state:', ctx.state);
      if (ctx.state === 'suspended') {
        await ctx.resume();
        console.log('[mic] AudioContext resumed');
      }
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;  // must be power of 2
      source.connect(analyser);
      analyserRef.current = analyser;
      drawBars();

      startRecorder(stream);
      console.log('[mic] microphone setup complete');
      return true;
    } catch (err) {
      console.error('[mic-error]', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatusMsg('⚠️ Microphone permission denied.');
      } else if (err.name === 'NotReadableError') {
        setStatusMsg('⚠️ Microphone busy. Close other apps and retry.');
      } else {
        setStatusMsg('⚠️ Could not access microphone. Please refresh.');
      }
      setBlocked(true);
      setPhase('INTRO');
      return false;
    }
  }

  // ── Entry flow ────────────────────────────────────────────────────────────
  useEffect(() => {
    const aborted = { v: false };

    async function run() {
      console.log('[voice-setup] entry flow started, lang=', lang);
      
      // Step 1 — ask for mic permission early (so user isn't blocked later)
      setStatusMsg('🎤 Requesting microphone…');
      const micOk = await startMicOnly();
      if (aborted.v || dead.current || !micOk) {
        console.log('[voice-setup] mic setup failed or aborted');
        return;
      }

      // Step 2 — play intro audio fully; mic is ON but SR is NOT started yet
      console.log('[voice-setup] mic ok, starting intro audio');
      setPhase('WAITING');
      setStatusMsg('🔊 Playing introduction audio…');
      const { blocked: isBlocked, el } = await playAudioStart(introAudioSrc);

      if (aborted.v || dead.current) return;

      if (isBlocked) {
        console.log('[voice-setup] intro audio blocked by browser');
        blockedAudio.current = el;
        setBlocked(true);
        setPhase('INTRO');
        setStatusMsg('Tap the button below to start');
        return;
      }

      // Wait for intro to fully finish before starting SR
      console.log('[voice-setup] waiting for intro audio to finish');
      await new Promise((res) => {
        if (!el) { res(); return; }
        if (el.ended) { res(); return; }
        el.onended = res;
        el.onerror = res;
      });

      if (aborted.v || dead.current) {
        console.log('[voice-setup] aborted before SR start');
        return;
      }

      // Step 3 — now start SR (intro is done, won't false-detect)
      console.log('[voice-setup] intro finished, starting SR');
      setPhase('LISTENING');
      setStatusMsg('Step 1 of 3 — speak now');
      startSR();
    }

    run();
    return () => { aborted.v = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Manual start (autoplay blocked) ───────────────────────────────────────
  async function handleManualStart() {
    console.log('[voice-setup] manual start triggered');
    setBlocked(false);

    if (!streamRef.current) {
      // Mic hasn't been set up yet — do it now with user gesture
      const micOk = await startMicOnly();
      if (!micOk || dead.current) {
        console.log('[voice-setup] mic setup failed in manual start');
        return;
      }
    }

    setPhase('WAITING');
    setStatusMsg('🔊 Playing introduction audio…');
    const el = blockedAudio.current;
    if (el) {
      el.currentTime = 0;
      await new Promise((res) => { el.onended = res; el.onerror = res; el.play().catch(res); });
    }
    if (dead.current) return;

    console.log('[voice-setup] manual start - starting SR');
    setPhase('LISTENING');
    setStatusMsg('Step 1 of 3 — speak now');
    startSR();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>

      {/* Header */}
      <div style={S.header}>
        <span>Swayam Lekh — Voice Setup</span>
        <div style={S.headerRight}>
          <span>Reg: <strong>{student?.registerNo}</strong></span>
          <span>Name: <strong>{student?.name}</strong></span>
          {saving  && <span style={{ color: '#fde68a' }}>💾 Saving…</span>}
          {saveMsg && <span style={{ color: '#6ee7b7' }}>{saveMsg}</span>}
        </div>
      </div>

      <div style={S.wrap}>

        {/* ── INTRO / waiting for tap ───────────────────────────────── */}
        {(phase === 'INTRO') && (
          <div style={{ ...S.card, textAlign: 'center', padding: '60px 40px' }}>
            {blocked ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎙️</div>
                <h2 style={S.title}>Ready to begin?</h2>
                <p style={{ ...S.sub, marginBottom: 24, color: statusMsg.startsWith('⚠️') ? '#e74c3c' : '#555' }}>
                  {statusMsg}
                </p>
                <button onClick={handleManualStart} style={S.startBtn}>
                  {statusMsg.startsWith('⚠️') ? 'Retry' : '▶  Start'}
                </button>
              </>
            ) : (
              <>
                <div style={S.spinner} />
                <p style={{ ...S.sub, marginTop: 20 }}>{statusMsg}</p>
              </>
            )}
          </div>
        )}

        {/* ── WAITING — mic on, intro playing, SR not started yet ───── */}
        {phase === 'WAITING' && (
          <div style={S.recordWrap}>
            <div style={S.recordHeader}>
              <h2 style={{ ...S.title, marginBottom: 4 }}>Voice Sample Recording</h2>
              <p style={S.sub}>Please listen to the instructions…</p>
            </div>

            {/* Minimal visualiser — single colour (frozen/hidden during intro) */}
            <div style={S.vizWrap}>
              <div style={S.vizBars}>
                {Array(VISUALIZER_BARS).fill(0).map((_, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 2, height: '2%', backgroundColor: '#1a3a5c', opacity: 0.1 }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LISTENING — SR active, tasks shown ───────────────────── */}
        {phase === 'LISTENING' && (
          <div style={S.recordWrap}>
            <div style={S.recordHeader}>
              <h2 style={{ ...S.title, marginBottom: 4 }}>Voice Sample Recording</h2>
              <p style={S.sub}>Step {activeTask + 1} of {tasks.length} — speak the phrase shown below clearly.</p>
            </div>

            {/* Task rows */}
            <div style={S.taskList}>
              {tasks.map((task, idx) => {
                const isDone   = taskDone[idx];
                const isActive = idx === activeTask && !isDone;
                const border   = isActive ? '#2980b9' : isDone ? '#27ae60' : '#e0e0e0';
                const bg       = isActive ? '#eaf4fb' : isDone ? '#eafaf1' : '#fafafa';
                const icon     = isDone ? '✅' : isActive ? '🎤' : '⬜';

                return (
                  <div key={task.id} style={{ padding: '14px 22px', borderTop: '1px solid #eee', background: bg, borderLeft: `4px solid ${border}`, transition: 'all 0.3s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 14, color: isDone ? '#1e8449' : isActive ? '#1a5276' : '#aaa' }}>
                          {task.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{task.hint}</div>
                        {isDone && (
                          <div style={{ fontSize: 11, color: '#27ae60', marginTop: 3 }}>
                            ✔ Detected
                          </div>
                        )}
                      </div>
                      {isActive && <span style={{ fontSize: 11, fontWeight: 'bold', color: '#2980b9', whiteSpace: 'nowrap' }}>LISTENING…</span>}
                      {isDone   && <span style={{ fontSize: 11, fontWeight: 'bold', color: '#27ae60' }}>DONE</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Minimal single-colour visualiser */}
            <div style={S.vizWrap}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>
                <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>●</span> Recording — Mic Level
              </div>
              <div style={S.vizBars}>
                {bars.map((v, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 2, height: `${Math.max(2, v * 100)}%`, backgroundColor: '#1a3a5c', opacity: Math.max(0.15, v) }} />
                ))}
              </div>
            </div>

            <div style={S.statusBar}>{statusMsg}</div>
          </div>
        )}

        {/* ── ALL THE BEST banner ───────────────────────────────────── */}
        {(phase === 'ALLBEST' || phase === 'DONE') && (
          <div style={{ ...S.card, textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌟</div>
            <h1 style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#1a3a5c',
              margin: '0 0 12px',
              letterSpacing: 1,
            }}>
              All the Best!
            </h1>
            <p style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>
              Voice setup complete. You're all set for your exam.
            </p>
            {phase === 'ALLBEST' && (
              <p style={{ fontSize: 13, color: '#2980b9', marginTop: 12 }}>
                🔊 {statusMsg}
              </p>
            )}
            {phase === 'DONE' && (
              <p style={{ fontSize: 13, color: '#888', marginTop: 12 }}>
                Redirecting to exam…
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root:        { minHeight: '100vh', backgroundColor: '#f2f4f7', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' },
  header:      { height: 52, backgroundColor: '#1a3a5c', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 14, fontWeight: 'bold', flexShrink: 0, gap: 12 },
  headerRight: { marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, opacity: 0.9, alignItems: 'center' },
  wrap:        { maxWidth: 860, margin: '32px auto', width: '100%', padding: '0 20px' },
  card:        { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8 },
  title:       { fontSize: 22, fontWeight: 'bold', color: '#1a3a5c', margin: '0 0 6px' },
  sub:         { fontSize: 14, color: '#555', margin: 0 },
  recordWrap:  { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' },
  recordHeader:{ padding: '24px 24px 14px' },
  taskList:    { display: 'flex', flexDirection: 'column' },
  statusBar:   { padding: '12px 24px', backgroundColor: '#eaf4fb', borderTop: '1px solid #aed6f1', fontSize: 13, fontWeight: 'bold', color: '#1a5276' },
  vizWrap:     { padding: '14px 24px', borderTop: '1px solid #eee', backgroundColor: '#fafafa' },
  vizBars:     { height: 50, display: 'flex', alignItems: 'flex-end', gap: 2 },
  spinner: {
    width: 36, height: 36, margin: '0 auto',
    border: '3px solid #ddd', borderTopColor: '#1a3a5c',
    borderRadius: '50%', animation: 'spin 0.9s linear infinite',
  },
  startBtn: {
    padding: '11px 32px', fontSize: 15, fontWeight: 'bold',
    backgroundColor: '#1a3a5c', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer',
  },
};
