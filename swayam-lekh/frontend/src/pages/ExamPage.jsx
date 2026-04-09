import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExam } from '../context/ExamContext';
import { useStudent } from '../context/StudentContext';
import { useVoice } from '../context/VoiceContext';
import { useExamTimer } from '../hooks/useExamTimer';
import { sarvamTranscribe } from '../utils/sarvamSTT';
import { useWhisper } from '../hooks/useWhisper';
import { applyPhoneticMap } from '../utils/phoneticMap';
import { createStudentSocket } from '../services/socketClient';

import ExamHeader from '../components/exam/ExamHeader';
import QuestionPanel from '../components/exam/QuestionPanel';
import AnswerBox from '../components/exam/AnswerBox';
import QuestionSidebar from '../components/exam/QuestionSidebar';
import GestureOverlay from '../components/GestureOverlay';
import { useGestureControl } from '../hooks/useGestureControl';
import ModeStatusBar from '../components/exam/ModeStatusBar';
import CountdownOverlay from '../components/exam/CountdownOverlay';
import AlarmOverlay from '../components/exam/AlarmOverlay';
import SecurityCodeModal from '../components/exam/SecurityCodeModal';
import MalpracticeModal from '../components/exam/MalpracticeModal';
import ExamLoadingScreen from '../components/exam/ExamLoadingScreen';

import { startVoiceMonitoring, stopVoiceMonitoring, setMonitorStream } from '../utils/voiceMonitor';
import { playSarvamTTS } from '../utils/sarvamTTS';
import { useQuestionAudioCache } from '../hooks/useQuestionAudioCache';
import Modal from '../components/ui/Modal';
import { COMMANDS } from '../constants/commands';
import CommandAssistant from '../components/exam/CommandAssistant';
import { detectVoiceCommand } from '../utils/voiceCommandMatcher';
import { extractQuestionParts, normalizePartAnswers, getPartAnswer, setPartAnswer } from '../utils/questionParts';
import { MATHS_SAMPLE_QUESTIONS } from '../data/mathsSampleQuestions';
import { buildQuestionVoiceText } from '../utils/questionSpeech';
import { isTTSPlaying } from '../utils/audioState.js';
import { convertMath } from '../utils/mathConverter';
import MathRenderer from '../components/exam/MathRenderer';

const MARK_SECTION_ORDER = [1, 2, 3, 5];
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function ExamPage() {
  const navigate = useNavigate();
  const {
    state,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    updateAnswer,
    setQuestions,
    toggleFlag,
    submitExam,
    confirmSubmit,
    dismissAlarm,
    triggerAlarm,
  } = useExam();

  const { student } = useStudent();
  const { mode, lastCommand, setLastCommand } = useVoice();
  const { timeLeft, formatted, isWarning, isCritical } = useExamTimer(state.startTime);
  const instructionLang = student?.instructionLang === 'ta' ? 'ta' : 'en';
  // Temporarily disable exam intro audio when true
  const DISABLE_INTRO_AUDIO = true;
  const examIntroSrc = DISABLE_INTRO_AUDIO ? null : (instructionLang === 'ta' ? '/audio/exam_intro_ta.mp3' : '/audio/exam_intro_en.mp3');
  const introAudioRef = useRef(null);
  const VERBOSE_GESTURE_UI = false;
  const VERBOSE_EXAM_PAGE = false;
  const [introBlocked, setIntroBlocked] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);
  const examMicRef = useRef(null);
  const hasLockedMicRef = useRef(false);
  const sarvamAudioRef = useRef(null);
  const capitalizeNextTextRef = useRef(false);
  const optionRecognitionRef = useRef(null);
  const sttBusyRef = useRef(false);
  const introDelayRef = useRef(null);
  const pendingQuestionNumberRef = useRef(false);
  const dictationBufferRef = useRef([]);
  const dictationSilenceTimerRef = useRef(null);
  const lastTranscriptTimestampRef = useRef(0);
  const lastReadQuestionRef = useRef(null);
  const lastSpokenTimestampRef = useRef(0);
  const lastThumbDownRef = useRef({ questionId: null, lastTs: 0, count: 0 });
  const commandListAudioRef = useRef(null);
  const lastSpokenOptionRef = useRef({ letter: null, ts: 0 });
  const [micStatus, setMicStatus] = useState('idle'); // idle | requesting | active | error
  const [micError, setMicError] = useState(null);
  const [micReady, setMicReady] = useState(false); // true once exam mic stream is open
  const [showCommandList, setShowCommandList] = useState(false);
  const [showCommandAssistant, setShowCommandAssistant] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState('all');
  const [spellMode, setSpellMode] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showMathModal, setShowMathModal] = useState(false);
  const [currentMathLatex, setCurrentMathLatex] = useState('');
  const videoRef = useRef(null); // visible preview (sidebar)
  const hiddenVideoRef = useRef(null); // hidden source for MediaPipe
  const [activeGesture, setActiveGesture] = useState(null);
  const commandHandlerRef = useRef(null);

  const closeCommandList = useCallback(() => {
    setShowCommandList(false);
  }, []);

  

  useEffect(() => {
    // Student socket integration: register and send an initial status
    let studentSocket;
    if (student && student.registerNo) {
      studentSocket = createStudentSocket({
        register_no: student.registerNo,
        student_name: student.name,
        handlers: {
          onDrawingData: (data) => {
            console.log('[StudentClient] drawing_data', data);
            // TODO: draw on a dedicated overlay canvas if desired
          },
          onProctorAudioStart: () => {
            console.log('[StudentClient] proctor requested audio session');
          }
        }
      });
      // send an initial status
      studentSocket.sendStatus({ answered: 0, total: (state.questions && state.questions.length) || 0 });
    }
    return () => { if (studentSocket) studentSocket.disconnect(); };
  }, [student?.registerNo, student?.name]);

  // Start webcam for gesture detection
  useEffect(() => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            try { if (hiddenVideoRef.current) hiddenVideoRef.current.srcObject = stream; } catch (e) { console.error('[ExamPage] set hidden video src failed', e); }
            try { if (videoRef.current) videoRef.current.srcObject = stream; } catch (e) { /* preview optional */ }
          })
          .catch((e) => console.error('[ExamPage] Webcam error:', e));
      }
    } catch (err) {
      console.error('[ExamPage] Webcam init error:', err);
    }
  }, []);

  // Gesture control
  useGestureControl({
    videoRef: hiddenVideoRef,
    enabled: true,
    onGesture: (gesture) => {
      const VERBOSE_GESTURE_UI = false;
      if (VERBOSE_GESTURE_UI) console.log('[ExamPage] gesture received:', gesture);
      try {
        const result = handleGestureAction(gesture);
        // handler may return boolean or an object { applied: true, display: 'SOMETHING' }
        let applied = false;
        let display = null;
        if (result && typeof result === 'object') {
          applied = !!result.applied;
          display = result.display || null;
        } else {
          applied = !!result;
        }

        if (applied) {
          const show = display || gesture;
          setActiveGesture(show);
          setTimeout(() => setActiveGesture(null), 1800);
        } else {
          if (VERBOSE_GESTURE_UI) console.log('[ExamPage] gesture ignored by handler:', gesture);
        }
      } catch (e) { console.error('[ExamPage] gesture handler error:', e); }
    },
  });

  // SpeechRecognition fallback for command detection (useWhisper)
  const { start: startWhisper, stop: stopWhisper, supported: whisperSupported } = useWhisper({
    lang: instructionLang === 'ta' ? 'ta-IN' : 'en-IN',
    onTranscript: (t) => {
      // final transcripts — forward to command handler if available
      try { if (t && commandHandlerRef.current) commandHandlerRef.current(t.toLowerCase()); } catch (e) { /* ignore */ }
    },
    onCommand: (chunk) => {
      try { if (chunk && commandHandlerRef.current) commandHandlerRef.current(chunk.toLowerCase()); } catch (e) { /* ignore */ }
    },
    continuous: true,
  });

  useEffect(() => {
    if (!whisperSupported) return undefined;
    // Start Whisper-based recognition when the exam is active and helper is closed
    if (examStarted && introCompleted && !showCommandAssistant) {
      try { startWhisper(); } catch (e) { console.warn('[ExamPage] startWhisper failed', e); }
    } else {
      stopWhisper();
    }
    return () => stopWhisper();
  }, [whisperSupported, examStarted, introCompleted, showCommandAssistant, startWhisper, stopWhisper]);

  useEffect(() => {
    const isMathsMode = student?.subjectMode === 'maths';
    if (isMathsMode) {
      setQuestions(MATHS_SAMPLE_QUESTIONS);
    }
  }, [setQuestions, student?.subjectMode]);

  const {
    preloadAllQuestions,
    playQuestion,
    stopAudio,
    loadingProgress,
    totalQuestions,
    cacheReady,
  } = useQuestionAudioCache();

  const startPersistentMic = useCallback(async () => {
    if (hasLockedMicRef.current || examMicRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus('error');
      setMicError('Microphone is not supported in this browser.');
      return;
    }
    setMicStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      examMicRef.current = stream;
      hasLockedMicRef.current = true;
      setMicStatus('active');
      setMicError(null);
      // Share this stream with the voice monitor BEFORE it starts, so no competing stream is opened
      setMonitorStream(stream);
      setMicReady(true); // triggers voice monitoring useEffect
      if (VERBOSE_GESTURE_UI) console.log('[ExamMic] Microphone locked for exam duration.');
    } catch (err) {
      console.error('[ExamMic] Failed to access microphone:', err);
      setMicStatus('error');
      setMicError(err?.message || 'Microphone permission denied.');
    }
  }, [setMicError, setMicStatus]);

  // Request microphone early once the startPersistentMic callback is defined
  useEffect(() => {
    startPersistentMic().catch((e) => console.warn('[ExamPage] startPersistentMic init failed', e));
  }, [startPersistentMic]);

  // Ensure browsers that block autoplay/auto-permission can still open mic on first user gesture.
  useEffect(() => {
    if (micStatus === 'active' || hasLockedMicRef.current) return undefined;
    const handler = () => {
      startPersistentMic().catch((e) => console.warn('[ExamPage] startPersistentMic user-gesture failed', e));
    };
    window.addEventListener('pointerdown', handler, { once: true });
    return () => window.removeEventListener('pointerdown', handler);
  }, [micStatus, startPersistentMic]);

  const playIntroAudio = useCallback(() => {
    if (!examIntroSrc) return;
    if (!introAudioRef.current) {
      introAudioRef.current = new Audio(examIntroSrc);
    }
    const audio = introAudioRef.current;
    audio.currentTime = 0;
    audio.play()
      .then(() => {
        setIntroBlocked(false);
      })
      .catch(() => {
        setIntroBlocked(true);
        startPersistentMic();
        markIntroComplete();
      });
  }, [examIntroSrc]);

  const markIntroComplete = useCallback(() => {
    if (introDelayRef.current) {
      clearTimeout(introDelayRef.current);
    }
    introDelayRef.current = setTimeout(() => {
      setIntroCompleted(true);
      introDelayRef.current = null;
    }, 2000);
  }, []);

  const langCode = instructionLang === 'ta' ? 'ta-IN' : 'en-IN';

  const audioQuestions = useMemo(() => (
    (state.questions || []).map((q, idx) => ({
      id: q.id,
      text: buildQuestionVoiceText(q, idx),
      isMaths: q.subject === 'maths',
    }))
  ), [state.questions]);

  useEffect(() => {
    if (!audioQuestions.length) return undefined;
    preloadAllQuestions(audioQuestions);
    return () => stopAudio();
  }, [audioQuestions, preloadAllQuestions, stopAudio]);

  useEffect(() => {
    if (examStarted || !state.questions?.length) return;
    setExamStarted(true);
    lastReadQuestionRef.current = state.questions[0].id;
    playQuestion(state.questions[0].id, buildQuestionVoiceText(state.questions[0], 0), {
      isMaths: state.questions[0]?.subject === 'maths',
    });
  }, [examStarted, playQuestion, state.questions]);

  useEffect(() => {
    if (showCommandList) {
      commandListAudioRef.current = new Audio('/audio/commandListAudio.mp3');
      commandListAudioRef.current.addEventListener('ended', () => setShowCommandList(false));
      commandListAudioRef.current.play().catch((err) => console.error('Failed to play command list audio:', err));
    } else {
      if (commandListAudioRef.current) {
        commandListAudioRef.current.pause();
        commandListAudioRef.current.currentTime = 0;
        commandListAudioRef.current = null;
      }
    }
  }, [showCommandList]);

  const noteCommand = useCallback((reason) => {
    if (reason) setLastCommand?.(reason);
  }, [setLastCommand]);

  const speakText = useCallback(async (text) => {
    if (!text || !text.trim()) return null;
    sarvamAudioRef.current?.pause();
    sarvamAudioRef.current = null;
    const audio = await playSarvamTTS(text, langCode);
    sarvamAudioRef.current = audio;
    return audio;
  }, [langCode]);

  const speakQuestionAloud = useCallback(async (question, idx) => {
    if (!question) return null;
    const numberIdx = Number.isInteger(idx) ? idx : undefined;
    // record when we requested speaking so other logic can reason about recent reads
    try { lastSpokenTimestampRef.current = Date.now(); } catch (_) { }
    return playQuestion(question.id, buildQuestionVoiceText(question, numberIdx), {
      isMaths: question.subject === 'maths',
    });
  }, [playQuestion]);

  const speakAnswerAloud = useCallback(async (question, answer) => {
    if (!question) return null;
    const resolveSpokenAnswer = () => {
      if (typeof answer === 'string') return answer;
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return '';

      const parts = extractQuestionParts(question?.text || '');
      if (parts.length) {
        const partTexts = parts
          .map((part) => {
            const text = getPartAnswer(answer, part.key, parts).trim();
            return text ? `${part.label}: ${text}` : '';
          })
          .filter(Boolean);
        if (partTexts.length) return partTexts.join('. ');
      }

      return Object.values(answer)
        .filter((value) => typeof value === 'string' && value.trim())
        .join('. ');
    };

    const spokenAnswer = resolveSpokenAnswer();
    let narration = '';
    if (Array.isArray(question.options) && question.options.length) {
      if (!spokenAnswer) {
        narration = instructionLang === 'ta' ? 'இதுவரை விருப்பம் தெரிவிக்கப்படவில்லை.' : 'No option selected yet.';
      } else {
        const idx = OPTION_LABELS.indexOf(spokenAnswer);
        const optionText = idx >= 0 ? question.options[idx] : '';
        narration = optionText
          ? `${instructionLang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட விருப்பம்' : 'Selected option'} ${spokenAnswer}. ${optionText}`
          : `${instructionLang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட விருப்பம்' : 'Selected option'} ${spokenAnswer}.`;
      }
    } else {
      narration = spokenAnswer?.trim()
        ? `${instructionLang === 'ta' ? 'உங்கள் பதில்' : 'Your answer'}: ${spokenAnswer}`
        : instructionLang === 'ta'
          ? 'இதுவரை பதில் எழுதப்படவில்லை.'
          : 'No answer typed yet.';
    }
    return speakText(narration);
  }, [instructionLang, speakText]);

  useEffect(() => {
    if (!showCommandList && examStarted && state.questions?.length) {
      const currentQuestion = state.questions[state.currentQuestionIndex];
      if (currentQuestion) {
        speakQuestionAloud(currentQuestion, state.currentQuestionIndex);
      }
      startPersistentMic();
    }
  }, [showCommandList, examStarted, state.questions, state.currentQuestionIndex, speakQuestionAloud, startPersistentMic]);

  useEffect(() => {
    if (DISABLE_INTRO_AUDIO) {
      // Skip playing intro audio but ensure intro is marked complete and mic is started
      try { startPersistentMic(); } catch (_) { }
      markIntroComplete();
      return undefined;
    }

    const audio = new Audio(examIntroSrc);
    audio.preload = 'auto';
    introAudioRef.current = audio;
    setIntroCompleted(false);

    const handleEnded = () => {
      startPersistentMic();
      markIntroComplete();
    };

    const handleError = () => {
      setIntroBlocked(true);
      startPersistentMic();
      markIntroComplete();
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    playIntroAudio();
    return () => {
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      introAudioRef.current = null;
      if (introDelayRef.current) {
        clearTimeout(introDelayRef.current);
        introDelayRef.current = null;
      }
      if (examMicRef.current) {
        examMicRef.current.getTracks().forEach((track) => track.stop());
        examMicRef.current = null;
      }
      hasLockedMicRef.current = false;
      setIntroCompleted(false);
      sarvamAudioRef.current?.pause();
      sarvamAudioRef.current = null;
      setMicStatus('idle');
    };
  }, [examIntroSrc, markIntroComplete, playIntroAudio, startPersistentMic]);

  useEffect(() => {
    if (!introBlocked) return undefined;
    const handler = () => {
      startPersistentMic();
      markIntroComplete();
      playIntroAudio();
      window.removeEventListener('pointerdown', handler);
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [introBlocked, playIntroAudio]);

  useEffect(() => {
    return () => {
      sarvamAudioRef.current?.pause();
      sarvamAudioRef.current = null;
      if (optionRecognitionRef.current) {
        try { optionRecognitionRef.current.stop(); } catch (_) { }
        optionRecognitionRef.current = null;
      }
    };
  }, []);

  const markSections = useMemo(() => {
    const grouped = {};
    state.questions.forEach((question) => {
      if (!grouped[question.marks]) grouped[question.marks] = [];
      grouped[question.marks].push(question);
    });

    return MARK_SECTION_ORDER
      .map((marks, idx) => ({
        id: `section-${idx + 1}`,
        label: `Section ${idx + 1}`,
        marks,
        questions: grouped[marks] || [],
      }))
      .filter((section) => section.questions.length);
  }, [state.questions]);

  const questionSectionMap = useMemo(() => {
    const map = new Map();
    markSections.forEach((section) => {
      section.questions.forEach((q) => map.set(q.id, section.id));
    });
    return map;
  }, [markSections]);

  useEffect(() => {
    if (!markSections.length) {
      setActiveSectionId('all');
      return;
    }
    setActiveSectionId((prev) => (markSections.some((section) => section.id === prev) ? prev : markSections[0].id));
  }, [markSections]);

  useEffect(() => {
    if (!markSections.length) return;
    const currentQuestionId = state.questions[state.currentIndex]?.id;
    if (!currentQuestionId) return;
    const inferredSectionId = questionSectionMap.get(currentQuestionId);
    if (inferredSectionId && inferredSectionId !== activeSectionId) {
      setActiveSectionId(inferredSectionId);
    }
  }, [activeSectionId, markSections.length, questionSectionMap, state.currentIndex, state.questions]);

  const moveToNextSection = useCallback(() => {
    if (!markSections.length) return false;
    const currentIdx = markSections.findIndex((section) => section.id === activeSectionId);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % markSections.length : 0;
    const nextSection = markSections[nextIdx];
    setActiveSectionId(nextSection.id);

    const firstQuestionId = nextSection.questions[0]?.id;
    if (firstQuestionId) {
      const targetIdx = state.questions.findIndex((q) => q.id === firstQuestionId);
      if (targetIdx >= 0) {
        jumpToQuestion(targetIdx);
      }
    }
    return true;
  }, [activeSectionId, jumpToQuestion, markSections, state.questions]);

  // ── Voice mismatch state ────────────────────────────────────────────────
  const [malpractice, setMalpractice] = useState(null); // null | { score, at }

  // ── handleMismatch callback (stable ref) ────────────────────────────────
  const handleMismatch = useCallback((similarityScore) => {
    setMalpractice({ score: similarityScore, at: new Date().toISOString() });
  }, []);

  // ── Start voice monitoring ONLY after mic is open (so monitor reuses shared stream)
  useEffect(() => {
    if (!student?.registerNo || !micReady) return;
    startVoiceMonitoring(student.registerNo, student.name, handleMismatch);
    return () => stopVoiceMonitoring();
  }, [student?.registerNo, micReady]);

  // ── Navigate to finish when exam submitted ──────────────────────────────
  useEffect(() => {
    if (state.submitted) navigate('/finish');
  }, [state.submitted]);

  const currentQuestion = state.questions[state.currentIndex];
  const storedAnswer = state.answers[currentQuestion?.id];
  const questionParts = useMemo(() => extractQuestionParts(currentQuestion?.text || ''), [currentQuestion?.text]);
  const currentAnswer = useMemo(() => (
    questionParts.length ? normalizePartAnswers(storedAnswer, questionParts) : (storedAnswer || '')
  ), [questionParts, storedAnswer]);
  const isFlagged = currentQuestion ? state.flags.includes(currentQuestion.id) : false;
  const [activePartKey, setActivePartKey] = useState(null);
  const currentAnswerRef = useRef(currentAnswer);

  useEffect(() => {
    if (!questionParts.length) {
      setActivePartKey(null);
      return;
    }
    setActivePartKey(questionParts[0].key);
  }, [currentQuestion?.id, questionParts]);

  useEffect(() => {
    currentAnswerRef.current = currentAnswer;
  }, [currentAnswer]);

  const resolveActivePartKey = useCallback(() => {
    if (!questionParts.length) return null;
    return activePartKey || questionParts[0]?.key || null;
  }, [activePartKey, questionParts]);

  const getActiveAnswerText = useCallback((answerValue) => {
    if (!questionParts.length) return typeof answerValue === 'string' ? answerValue : '';
    return getPartAnswer(answerValue, resolveActivePartKey(), questionParts);
  }, [questionParts, resolveActivePartKey]);

  const writeCurrentAnswer = useCallback((nextValue, forcedPartKey = null) => {
    if (!currentQuestion?.id) return;
    if (!questionParts.length) {
      updateAnswer(currentQuestion.id, nextValue);
      return;
    }
    const targetPartKey = forcedPartKey || resolveActivePartKey();
    if (!targetPartKey) return;
    updateAnswer(currentQuestion.id, setPartAnswer(currentAnswerRef.current, targetPartKey, nextValue, questionParts));
  }, [currentQuestion?.id, questionParts, resolveActivePartKey, updateAnswer]);

  function handleGestureAction(gesture) {
    try {
      switch (gesture) {
        case 'THUMB_RIGHT':
          nextQuestion();
          return true;
        case 'THUMB_LEFT':
          prevQuestion();
          return true;
        case 'OPEN_PALM': {
          // Swapped behavior: OPEN_PALM now clears the current answer (sections 1..4)
          try {
            if (!currentQuestion) return false;
            const sectionId = questionSectionMap.get(currentQuestion?.id) || 'all';
            const allowed = ['section-1', 'section-2', 'section-3', 'section-4', 'all'];
            if (!allowed.includes(sectionId)) return false;
            const existing = getActiveAnswerText(currentAnswerRef.current || '').trim();
            if (!existing) return false;
            writeCurrentAnswer('');
            // Only clear the answer visually/state-wise; do not vocalize.
            return { applied: true, display: 'OPEN_PALM' };
          } catch (e) { console.error('[ExamPage] OPEN_PALM handler error:', e); return false; }
        }
        // CLOSED_FIST gesture removed: do not toggle microphone via gesture
        case 'THUMB_UP': {
          // Repeat the current question aloud and show a repeating display
          try {
            if (!currentQuestion) return false;
            // Always attempt to repeat the question on thumb-up
            speakQuestionAloud(currentQuestion, state.currentIndex);
            return { applied: true, display: 'Repeating question' };
          } catch (e) { console.error('[ExamPage] THUMB_UP handler error:', e); return false; }
        }
        case 'THUMB_DOWN': {
          try {
            if (!currentQuestion) return false;
            if (isTTSPlaying()) return false;
            const qid = currentQuestion.id;
            const now = Date.now();
            const last = lastThumbDownRef.current || { questionId: null, lastTs: 0, count: 0 };
            const justSpoken = (lastSpokenTimestampRef.current && (now - lastSpokenTimestampRef.current) < 3000);
            if (last.questionId === qid && (now - last.lastTs) < 3000) {
              lastThumbDownRef.current = { questionId: null, lastTs: 0, count: 0 };
              speakQuestionAloud(currentQuestion, state.currentIndex);
              return true;
            }
            if (justSpoken) {
              lastThumbDownRef.current = { questionId: qid, lastTs: now, count: 1 };
              if (VERBOSE_GESTURE_UI) console.log('[ExamPage] THUMB_DOWN noted — awaiting confirmation to repeat (quick second thumb to confirm)');
              return false;
            }
            lastThumbDownRef.current = { questionId: null, lastTs: 0, count: 0 };
            speakQuestionAloud(currentQuestion, state.currentIndex);
            return true;
          } catch (err) { console.error('[ExamPage] THUMB_DOWN handling error:', err); return false; }
        }
        case 'ONE_FINGER':
        case 'TWO_FINGERS':
        case 'THREE_FINGERS':
        case 'FOUR_FINGERS': {
          const sectionId = questionSectionMap.get(currentQuestion?.id) || 'all';
          if (sectionId === 'section-1') {
            if (!currentQuestion?.options?.length) break;
            const map = { ONE_FINGER: 'A', TWO_FINGERS: 'B', THREE_FINGERS: 'C', FOUR_FINGERS: 'D' };
            const letter = map[gesture];
            if (!letter) break;
            updateAnswer(currentQuestion.id, letter);
            setTimeout(() => { try { nextQuestion(); } catch (_) { } }, 250);
            return true;
          }
          try {
            if (!currentQuestion) return { applied: false };
            const sectionId = questionSectionMap.get(currentQuestion?.id) || 'all';
            const deletionSections = new Set(['section-2', 'section-3', 'section-4']);
            const deleteMap = { ONE_FINGER: 1, TWO_FINGERS: 2, THREE_FINGERS: 3, FOUR_FINGERS: 4 };
            const n = deleteMap[gesture] || 0;
            const existing = getActiveAnswerText(currentAnswerRef.current || '').trim();
            if (!existing) return { applied: false };

            if (deletionSections.has(sectionId) && n > 0) {
              const deleteLastNWords = (text, count) => {
                if (!text) return '';
                const words = text.trim().split(/\s+/);
                if (!words.length) return '';
                const remove = Math.min(count, words.length);
                words.splice(-remove, remove);
                return words.join(' ');
              };
              const newVal = deleteLastNWords(existing, n);
              writeCurrentAnswer(newVal);
              const disp = `Deleted ${n} word${n > 1 ? 's' : ''}`;
              speakText(instructionLang === 'ta' ? `கடைசி ${n} சொற்கள் நீக்கப்பட்டன` : disp);
              return { applied: true, display: disp };
            }

            // Fallback for non-deletion sections: clear entire answer
            writeCurrentAnswer('');
            speakText(instructionLang === 'ta' ? 'பதில் அழிக்கப்பட்டது' : 'Answer cleared');
            return { applied: true, display: 'OPEN_PALM' };
          } catch (e) { console.error('[ExamPage] multi-finger delete handler error:', e); return { applied: false }; }
        }
        default:
          return false;
      }
    } catch (err) {
      console.error('[ExamPage] handleGestureAction error:', err);
      return false;
    }
  }

  useEffect(() => {
    if (!currentQuestion || !introCompleted || !examStarted) return;

    const sameQuestionRerun = lastReadQuestionRef.current === currentQuestion.id;
    lastReadQuestionRef.current = currentQuestion.id;

    dictationBufferRef.current = [];
    if (dictationSilenceTimerRef.current) {
      clearTimeout(dictationSilenceTimerRef.current);
      dictationSilenceTimerRef.current = null;
    }

    let cancelled = false;
    let optionCaptured = false;

    const stopRecognition = () => {
      if (optionRecognitionRef.current) {
        try {
          const r = optionRecognitionRef.current;
          // Clear all handlers first so no callbacks fire after stop
          r.ondataavailable = null;
          r.onstop = null;
          r.onerror = null;
          if (r.state && r.state !== 'inactive') r.stop(); // MediaRecorder
        } catch (_) { }
        optionRecognitionRef.current = null;
      }
    };

    const detectSpokenOption = (text = '') => {
      const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!normalized) return null;
      const tokens = normalized.split(' ');
      const padded = ` ${normalized} `;
      const aliasMap = {
        A: ['option a', 'choice a', 'letter a', 'select a', 'answer a', 'a', 'ay', 'eh', 'hey', 'one', 'first'],
        B: ['option b', 'choice b', 'letter b', 'select b', 'answer b', 'b', 'bee', 'be', 'two', 'second'],
        C: ['option c', 'choice c', 'letter c', 'select c', 'answer c', 'c', 'see', 'sea', 'three', 'third'],
        D: ['option d', 'choice d', 'letter d', 'select d', 'answer d', 'd', 'dee', 'thee', 'four', 'fourth'],
        E: ['option e', 'choice e', 'letter e', 'select e', 'answer e', 'e', 'yee', 'five', 'fifth'],
        F: ['option f', 'choice f', 'letter f', 'select f', 'answer f', 'f', 'eff', 'six', 'sixth'],
      };
      for (const [letter, aliases] of Object.entries(aliasMap)) {
        const matched = aliases.some((alias) => {
          if (alias.includes(' ')) {
            return padded.includes(` ${alias} `);
          }
          return tokens.includes(alias);
        });
        if (matched) return letter;
      }
      const match = normalized.match(/\b([a-f])\b/);
      return match ? match[1].toUpperCase() : null;
    };

    const parseSpokenNumber = (raw) => {
      if (!raw) return NaN;

      const normalizeNumberText = (value) => (value || '')
        .toString()
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const map = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
        sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
        thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
        // Common STT homophones/mishears for counts
        oh: 0, o: 0, won: 1, to: 2, too: 2, tu: 2, tree: 3, for: 4, fore: 4, ate: 8,
      };

      const normalized = normalizeNumberText(raw);
      if (!normalized) return NaN;

      // Digits (with or without spaces)
      const digitsOnly = normalized.replace(/\s+/g, '');
      if (/^\d{1,3}$/.test(digitsOnly)) {
        return parseInt(digitsOnly, 10);
      }

      const tokens = normalized.split(' ').filter(Boolean);

      // Single token direct map (e.g., seventeen)
      if (tokens.length === 1 && map[normalized] !== undefined) {
        return map[normalized];
      }

      // Two-token combos (e.g., "seven teen", "one seven", "twenty three")
      if (tokens.length === 2) {
        const [a, b] = tokens;
        const aVal = map[a];
        const bVal = map[b];

        // "seven teen" → 17
        if (b === 'teen' && aVal !== undefined && aVal < 10) {
          return aVal + 10;
        }

        // "twenty three" → 23
        if (aVal !== undefined && aVal >= 20 && aVal % 10 === 0 && bVal !== undefined && bVal < 10) {
          return aVal + bVal;
        }

        // "one seven" → 17, "one five" → 15
        if (aVal !== undefined && bVal !== undefined && aVal < 10 && bVal < 10) {
          return aVal * 10 + bVal;
        }
      }

      // Three-token case like "one seven teen" → 17
      if (tokens.length === 3) {
        const lastTwo = `${tokens[1]} ${tokens[2]}`;
        const val = parseSpokenNumber(lastTwo);
        if (!Number.isNaN(val)) return val;
      }

      return NaN;
    };

    const handleSpokenOption = (letter) => {
      if (!currentQuestion?.options?.length) return;
      const idx = OPTION_LABELS.indexOf(letter);
      if (idx < 0 || idx >= currentQuestion.options.length) return;
      // Suppress duplicate detections of the same letter within a short window
      const now = Date.now();
      const last = lastSpokenOptionRef.current || { letter: null, ts: 0 };
      if (last.letter === letter && (now - last.ts) < 1500) {
        if (VERBOSE_GESTURE_UI) console.log('[ExamPage] Ignoring duplicate spoken option:', letter);
        return;
      }
      lastSpokenOptionRef.current = { letter, ts: now };

      optionCaptured = true;
      sarvamAudioRef.current?.pause();
      sarvamAudioRef.current = null;
      updateAnswer(currentQuestion.id, letter);
      stopRecognition();
      setTimeout(() => {
        nextQuestion();
      }, 250);
    };

    const formatDictationText = (text, capitalizeFirstLetter = false) => {
      let out = (text || '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\r/g, '')
        .toLowerCase();

      if (capitalizeFirstLetter) {
        out = out.replace(/(^|[\n•]\s*)([a-z])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
      }

      return out;
    };

    const handlePartCommand = (text = '') => {
      if (!questionParts.length) return false;
      const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
      const match = normalized.match(/\b(?:part|section)\s*([a-z])\b(?:\s*[:.-]?\s*(.*))?/i);
      if (!match) return false;

      const targetPartKey = match[1]?.toUpperCase();
      if (!questionParts.some((part) => part.key === targetPartKey)) return false;

      setActivePartKey(targetPartKey);
      noteCommand(`Switched to Part ${targetPartKey}`);

      const remainder = (match[2] || '').trim();
      if (remainder) {
        appendDictation(remainder, targetPartKey);
      }

      return true;
    };

    const appendDictation = (text = '', forcedPartKey = null) => {
      if (!text) return;

      // Support raw insertion when caller prefixes the text with ::RAW::
      let isRaw = false;
      let payload = text;
      if (payload.startsWith('::RAW::')) {
        isRaw = true;
        payload = payload.replace(/^::RAW::/, '');
      }

      let normalized = isRaw ? payload : formatDictationText(payload, capitalizeNextTextRef.current);
      capitalizeNextTextRef.current = false;
      if (!normalized.trim() && !/\n/.test(normalized)) return;

      const innerAppend = async () => {
        let finalText = normalized;

        // Apply math conversion in maths mode when in ANSWER mode
        const isMathsMode = student?.subjectMode === 'maths';
        if (isMathsMode && mode === 'ANSWER') {
            try {
            finalText = await convertMath(normalized);
            if (VERBOSE_EXAM_PAGE) console.log(`MathConverter applied: "${normalized}" → "${finalText}"`);
          } catch (err) {
            console.error('Math conversion error:', err);
            // Continue with original normalized text if conversion fails
          }
        }

        if (questionParts.length) {
          const targetPartKey = forcedPartKey || resolveActivePartKey();
          if (!targetPartKey) return;
          const base = getPartAnswer(currentAnswerRef.current, targetPartKey, questionParts);
          const needsSpace = base && !finalText.startsWith('\n');
          const merged = needsSpace ? `${base} ${finalText}` : `${base}${finalText}`;
          writeCurrentAnswer(merged, targetPartKey);
          noteCommand(`Captured answer for Part ${targetPartKey}`);
          return;
        }

        const base = currentAnswerRef.current || '';
        const needsSpace = base && !finalText.startsWith('\n');
        const merged = needsSpace ? `${base} ${finalText}` : `${base}${finalText}`;
        writeCurrentAnswer(merged);
        noteCommand('Captured answer from speech');
      };

      void innerAppend();
    };

    const resumeRecognitionIfNeeded = () => {
      if (!cancelled && !optionCaptured) {
        startRecognition();
      }
    };

    const speakWithRecognitionPause = (speaker) => {
      if (typeof speaker !== 'function') return;
      // Keep recognition running while TTS plays so voice commands still work.
      // We avoid calling stopRecognition() here; any audio returned will continue
      // while recognition runs. If your environment routes TTS to the mic, you
      // may get self-detected speech — use headphones if possible.
      Promise.resolve(speaker())
        .then(() => {
          // no-op: do not stop or resume recognition
        })
        .catch(() => {
          // ignore speaker errors and leave recognition running
        });
    };

    const extractQuestionNumber = (text) => {
      if (!text) return null;
      const normalized = text
        .toLowerCase()
        .replace(/-/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!normalized) return null;
      const tokens = normalized.split(' ').filter(Boolean);

      // Walk from the end to find the most recent numeric expression
      for (let i = tokens.length - 1; i >= 0; i -= 1) {
        const single = tokens[i];
        let candidate = parseSpokenNumber(single);
        if (!Number.isNaN(candidate)) return candidate;

        if (i > 0) {
          const pair = `${tokens[i - 1]} ${tokens[i]}`;
          candidate = parseSpokenNumber(pair);
          if (!Number.isNaN(candidate)) return candidate;
        }

        if (i > 1) {
          const trio = `${tokens[i - 2]} ${tokens[i - 1]} ${tokens[i]}`;
          candidate = parseSpokenNumber(trio);
          if (!Number.isNaN(candidate)) return candidate;
        }
      }

      return null;
    };

    const isAddPointCommand = (text = '') => {
      const phrase = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (!phrase) return false;
      return /\b(add|ad|at|hard)\s+point\b/.test(phrase) || /\bbullet\s+point\b/.test(phrase);
    };

    const handleCommandChunk = (chunk) => {
      const normalized = chunk.toLowerCase();
      if (!normalized) return false;
      const commandWordCount = normalized.split(/\s+/).filter(Boolean).length;
      const isLikelyStandaloneCommand = commandWordCount <= 4;

      if (handlePartCommand(normalized)) {
        return true;
      }

      if (pendingQuestionNumberRef.current) {
        const targetNum = extractQuestionNumber(normalized);
        pendingQuestionNumberRef.current = false;
        if (targetNum !== null) {
          const targetIdx = targetNum - 1;
          if (targetIdx >= 0 && targetIdx < state.questions.length) {
            optionCaptured = true;
            stopRecognition();
            jumpToQuestion(targetIdx);
            noteCommand(`Jumped to question ${targetIdx + 1}`);
            return true;
          }
          noteCommand('Could not understand the question number');
          return true;
        }
      }

      if (/(^|\s)spell\s+mode(\s|$)/.test(normalized)) {
        setSpellMode(true);
        noteCommand('Spell mode on');
        return true;
      }

      if (/(^|\s)end\s+spell(\s|$)/.test(normalized)) {
        setSpellMode(false);
        noteCommand('Spell mode off');
        return true;
      }

      // Allow implicit delete phrases like "last five words" without saying "delete".
      const isStandaloneDelete = /\blast\b/.test(normalized)
        && /\bwords?\b/.test(normalized)
        && !/\bdelete\b/.test(normalized);
      if (isStandaloneDelete) {
        const countText = normalized
          .replace(/\b(last|word|words)\b/g, ' ')
          .replace(/\b(the|a|an|please)\b/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const parsedCount = countText ? parseSpokenNumber(countText) : NaN;
        const count = !Number.isNaN(parsedCount) && parsedCount > 0 ? parsedCount : 1;

        if (Array.isArray(currentQuestion?.options) && currentQuestion.options.length) {
          writeCurrentAnswer('');
          noteCommand('Cleared answer');
          return true;
        }

        const words = getActiveAnswerText(currentAnswerRef.current).trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          noteCommand('Nothing to delete');
          return true;
        }
        const trimmed = count >= words.length ? [] : words.slice(0, words.length - count);
        const updated = trimmed.join(' ');
        writeCurrentAnswer(updated);
        speakWithRecognitionPause(() => speakAnswerAloud(currentQuestion, updated));
        noteCommand(count === 1 ? 'Deleted last word' : `Deleted ${count} words`);
        return true;
      }

      const matched = detectVoiceCommand(normalized);
      if (matched) {
        if (matched === 'list commands') {
          optionCaptured = true;
          setShowCommandList(true);
          noteCommand('Command list opened');
          return true;
        }

        if (matched === 'skip skip') {
          if (showCommandList) {
            if (commandListAudioRef.current) {
              commandListAudioRef.current.pause();
              commandListAudioRef.current.currentTime = 0;
            }
            setShowCommandList(false);
            noteCommand('Command list closed');
            return true;
          }
        }

        if (matched === 'stop' || matched === 'help') {
          setShowCommandAssistant(true);
          noteCommand('Help requested - Opening Assistant');
          return true;
        }

        if (matched === 'submit') {
          optionCaptured = true;
          stopRecognition();
          nextQuestion();
          noteCommand('Submitted answer and moved to next question');
          return true;
        }

        if (matched === 'finish') {
          optionCaptured = true;
          stopRecognition();
          confirmSubmit();
          noteCommand('Exam finished');
          return true;
        }

        if (matched === 'skip') {
          const targetNum = extractQuestionNumber(normalized);
          const expectsNumber = /\b(to|question|number)\b/.test(normalized);
          if (targetNum !== null) {
            const targetIdx = targetNum - 1;
            if (targetIdx >= 0 && targetIdx < state.questions.length) {
              optionCaptured = true;
              stopRecognition();
              jumpToQuestion(targetIdx);
              noteCommand(`Jumped to question ${targetIdx + 1}`);
              return true;
            }
            noteCommand('Could not understand the question number');
            return true;
          }
          if (expectsNumber) {
            pendingQuestionNumberRef.current = true;
            noteCommand('Listening for question number');
            return true;
          }
          optionCaptured = true;
          stopRecognition();
          nextQuestion();
          noteCommand('Skipped question');
          return true;
        }

        if (matched === 'repeat') {
          if (normalized.includes('answer')) {
            speakWithRecognitionPause(() => speakAnswerAloud(currentQuestion, currentAnswerRef.current));
            noteCommand('Repeating answer');
          } else if (normalized.includes('option')) {
            speakWithRecognitionPause(() => speakQuestionAloud(currentQuestion, state.currentIndex));
            noteCommand('Repeating options');
          } else {
            speakWithRecognitionPause(() => speakQuestionAloud(currentQuestion, state.currentIndex));
            noteCommand('Repeating question');
          }
          return true;
        }

        if (matched === 'read back') {
          // In maths mode, temporarily hold readback to avoid speaking math content
          if (student?.subjectMode === 'maths') {
            noteCommand('Readback held for maths mode');
            return true;
          }
          speakWithRecognitionPause(() => speakAnswerAloud(currentQuestion, currentAnswerRef.current));
          noteCommand('Repeating answer');
          return true;
        }

        if (matched === 'clear') {
          writeCurrentAnswer('');
          noteCommand('Cleared answer');
          return true;
        }

        if (matched === 'flag') {
          toggleFlag(currentQuestion.id);
          noteCommand('Toggled flag');
          return true;
        }

        if (matched === 'delete') {
          const extractDeleteCount = (phrase) => {
            // Examples: "delete last 4 words", "delete four words", "delete last for words"
            const explicitWords = phrase.match(/\bdelete(?:\s+last)?\s+([a-z0-9\s-]+?)\s+words?\b/);
            if (explicitWords?.[1]) {
              const parsed = parseSpokenNumber(explicitWords[1].trim());
              if (!Number.isNaN(parsed) && parsed > 0) return parsed;
            }

            const explicitDigits = phrase.match(/\bdelete(?:\s+last)?\s+(\d{1,3})\b/);
            if (explicitDigits?.[1]) {
              const parsed = parseInt(explicitDigits[1], 10);
              if (!Number.isNaN(parsed) && parsed > 0) return parsed;
            }

            const tailMatch = phrase.match(/\bdelete\b\s*(.*)$/);
            const tail = (tailMatch?.[1] || '')
              .replace(/\b(last|word|words|by)\b/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (tail) {
              const parsed = parseSpokenNumber(tail);
              if (!Number.isNaN(parsed) && parsed > 0) return parsed;

              const digitFallback = parseInt(tail, 10);
              if (!Number.isNaN(digitFallback) && digitFallback > 0) return digitFallback;
            }

            return 1;
          };

          if (Array.isArray(currentQuestion?.options) && currentQuestion.options.length) {
            writeCurrentAnswer('');
            noteCommand('Cleared answer');
          } else {
            const count = extractDeleteCount(normalized);
            const words = getActiveAnswerText(currentAnswerRef.current).trim().split(/\s+/).filter(Boolean);
            if (words.length === 0) {
              noteCommand('Nothing to delete');
              return true;
            }
            const trimmed = count >= words.length ? [] : words.slice(0, words.length - count);
            const updated = trimmed.join(' ');
            writeCurrentAnswer(updated);
            speakWithRecognitionPause(() => speakAnswerAloud(currentQuestion, updated));
            noteCommand(count === 1 ? 'Deleted last word' : `Deleted ${count} words`);
          }
          return true;
        }

        if (matched === 'go to') {
          const targetNum = extractQuestionNumber(normalized);
          if (targetNum !== null) {
            const targetIdx = targetNum - 1;
            if (targetIdx >= 0 && targetIdx < state.questions.length) {
              optionCaptured = true;
              stopRecognition();
              jumpToQuestion(targetIdx);
              noteCommand(`Jumped to question ${targetIdx + 1}`);
              return true;
            }
            noteCommand('Could not understand the question number');
            return true;
          }
          pendingQuestionNumberRef.current = true;
          noteCommand('Listening for question number');
          return true;
        }

        if (matched === 'start') {
          noteCommand('Start command heard');
          return true;
        }

        // ── MATH MODE COMMANDS ──
        if (matched === 'show math' || /show\s+(?:math|equation)/.test(normalized)) {
          const isMathsMode = student?.subjectMode === 'maths';
          if (!isMathsMode) {
            noteCommand('Math display only available in maths mode');
            return true;
          }

          const currentAnswer = currentAnswerRef.current || '';
          if (!currentAnswer.trim()) {
            noteCommand('No equation to display');
            return true;
          }

          // Convert current answer to LaTeX if not already done
          const convertAndDisplay = async () => {
            try {
              const latex = await convertMath(currentAnswer);
              setCurrentMathLatex(latex);
              setShowMathModal(true);
              noteCommand('Showing math equation');
            } catch (err) {
              console.error('Error converting math for display:', err);
              noteCommand('Could not convert equation');
            }
          };

          void convertAndDisplay();
          return true;
        }

        if (matched === 'clear math' || /clear\s+(?:math|equation)/.test(normalized)) {
          const isMathsMode = student?.subjectMode === 'maths';
          if (!isMathsMode) {
            noteCommand('Math clear only available in maths mode');
            return true;
          }

          setCurrentMathLatex('');
          setShowMathModal(false);
          noteCommand('Cleared math display');
          return true;
        }

        if (matched === 'read math' || /read\s+(?:math|equation)/.test(normalized)) {
          const isMathsMode = student?.subjectMode === 'maths';
          if (!isMathsMode) {
            noteCommand('Math reading only available in maths mode');
            return true;
          }

          if (!currentMathLatex) {
            noteCommand('No equation to read');
            return true;
          }

          const readMath = async () => {
            try {
              await playSarvamTTS(currentMathLatex, 'en-IN');
              noteCommand('Reading math equation');
            } catch (err) {
              console.error('Error reading math:', err);
              noteCommand('Could not read equation');
            }
          };

          void readMath();
          return true;
        }
      }

      const looseTargetNum = extractQuestionNumber(normalized);
      if (looseTargetNum !== null && normalized.includes('question')) {
        const targetIdx = looseTargetNum - 1;
        if (targetIdx >= 0 && targetIdx < state.questions.length) {
          optionCaptured = true;
          stopRecognition();
          jumpToQuestion(targetIdx);
          noteCommand(`Jumped to question ${targetIdx + 1}`);
          return true;
        }
        noteCommand('Could not understand the question number');
        return true;
      }

      if (spellMode) {
        const letters = normalized
          .replace(/[^a-z\s]/gi, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        const allLetters = letters.length > 1 && letters.every((t) => t.length === 1 && /[a-z]/i.test(t));
        if (allLetters) {
          const word = letters.join('');
          const formatted = word.toLowerCase();
          appendDictation(formatted);
          speakWithRecognitionPause(() => speakText(`Added word: ${formatted}`));
          noteCommand('Spell word added');
          return true;
        }
      }

      const correctMatch = normalized.match(/correct\s+(.+?)\s+to\s+(.+)/i);
      if (correctMatch) {
        const wrong = correctMatch[1]?.trim();
        const right = correctMatch[2]?.trim();
        if (wrong && right && currentQuestion?.id) {
          const current = getActiveAnswerText(currentAnswerRef.current);
          const safeWrong = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(safeWrong, 'i');
          const updated = current.replace(regex, right);
          if (updated !== current) {
            writeCurrentAnswer(updated);
            speakWithRecognitionPause(() => speakText(`Corrected. The sentence now reads: ${updated}`));
          }
          noteCommand('Manual correction');
          return true;
        }
      }



      const finishByMatch = normalized.match(/\bfinish\s+by\b(.+)/);
      if (finishByMatch) {
        const spoken = (finishByMatch[1] || '').replace(/\D/g, '');
        const target = (student?.registerNo || '').replace(/\D/g, '');
        if (spoken === target && target) {
          confirmSubmit();
          noteCommand('Exam finished by voice command');
        } else {
          noteCommand('Finish command rejected: roll number mismatch');
        }
        return true;
      }

      if (normalized.includes('delete answer')) {
        writeCurrentAnswer('');
        noteCommand('Answer cleared');
        return true;
      }

      if (normalized.includes('scratch that')) {
        const current = getActiveAnswerText(currentAnswerRef.current);
        const trimmed = current.trimEnd();
        if (trimmed) {
          const sentences = trimmed.split(/(?<=[.!?\n])\s+/);
          const updated = sentences.length > 1 ? sentences.slice(0, -1).join(' ') : '';
          writeCurrentAnswer(updated);
          speakWithRecognitionPause(() => speakText(updated ? `Removed last sentence. Now: ${updated}` : 'Removed last sentence.'));
        }
        noteCommand('Scratch last sentence');
        return true;
      }

      if (/(^|\s)clear(\s|$)/.test(normalized) && isLikelyStandaloneCommand) {
        writeCurrentAnswer('');
        noteCommand('Cleared answer');
        return true;
      }

      const skipQuestionMatch = normalized.match(/skip\s+question\s+(?:number\s+)?([a-z]+|\d{1,3})/);
      const skipToMatch = normalized.match(/skip(?:\s+to)?(?:\s+question)?\s+(?:number\s+)?([a-z]+|\d{1,3})/);
      const skipCandidate = skipQuestionMatch || skipToMatch;
      if (skipCandidate) {
        const spoken = skipCandidate[1];
        const targetIdx = parseSpokenNumber(spoken) - 1;
        if (!Number.isNaN(targetIdx) && targetIdx >= 0 && targetIdx < state.questions.length) {
          optionCaptured = true;
          stopRecognition();
          jumpToQuestion(targetIdx);
          noteCommand(`Jumped to question ${targetIdx + 1}`);
          return true;
        }
        noteCommand('Could not understand the question number');
        return true;
      }

      if (normalized.includes('next section') || normalized.includes('skip section')) {
        const changed = moveToNextSection();
        if (changed) {
          optionCaptured = true;
          stopRecognition();
          noteCommand('Moved to next section');
        }
        return true;
      }

      if (/(^|\s)skip(\s|$)/.test(normalized)) {
        optionCaptured = true;
        stopRecognition();
        nextQuestion();
        noteCommand('Skipped question');
        return true;
      }

      if (/(^|\s)submit(\s|$)/.test(normalized)) {
        optionCaptured = true;
        stopRecognition();
        nextQuestion();
        noteCommand('Submitted answer and moved to next question');
        return true;
      }

      if (normalized.includes('repeat question')) {
        speakWithRecognitionPause(() => speakQuestionAloud(currentQuestion, state.currentIndex));
        noteCommand('Repeating question');
        return true;
      }

      if (normalized.includes('repeat answer')) {
        speakWithRecognitionPause(() => speakAnswerAloud(currentQuestion, currentAnswerRef.current));
        noteCommand('Repeating answer');
        return true;
      }

      if (normalized.includes('repeat option') && Array.isArray(currentQuestion?.options)) {
        speakWithRecognitionPause(() => speakQuestionAloud(currentQuestion, state.currentIndex));
        noteCommand('Repeating options');
        return true;
      }

      if (normalized.includes('next question')) {
        optionCaptured = true;
        stopRecognition();
        nextQuestion();
        noteCommand('Next question');
        return true;
      }

      if (normalized.includes('previous question') || normalized.includes('go back') || normalized.includes('back question')) {
        optionCaptured = true;
        stopRecognition();
        prevQuestion();
        noteCommand('Previous question');
        return true;
      }

      if (isAddPointCommand(normalized)) {
        if (Array.isArray(currentQuestion?.options) && currentQuestion.options.length) {
          return false;
        }
        const bullet = '• ';
        let updated = getActiveAnswerText(currentAnswerRef.current).trimEnd();
        if (!updated) {
          updated = bullet;
        } else {
          if (!/[.!?]$/.test(updated)) updated = `${updated}.`;
          updated = `${updated}\n${bullet}`;
        }
        writeCurrentAnswer(updated);
        capitalizeNextTextRef.current = true;
        noteCommand('Added bullet point');
        return true;
      }

      return false;
    };

    // Make the command handler available to the SpeechRecognition fallback
    try {
      commandHandlerRef.current = (chunk) => {
        try {
          // If the exam mic is not active or the chatbot is open, ignore incoming transcripts entirely
          if (!examMicRef.current || micStatus !== 'active' || showCommandAssistant) {
            if (VERBOSE_EXAM_PAGE) console.log('[ExamPage] Ignoring transcript because mic is not active or Chatbot is open');
            return false;
          }

          const handled = handleCommandChunk(chunk || '');
              // If not handled as a command, check for spoken MCQ option first
              if (!handled) {
                try {
                  const isMcqQuestion = Array.isArray(currentQuestion?.options) && currentQuestion.options.length;
                  if (isMcqQuestion) {
                    const letter = detectSpokenOption(chunk);
                    if (letter) {
                      handleSpokenOption(letter);
                      return true;
                    }
                  }
                } catch (_) { /* ignore option-detect errors */ }

                try { void enqueueDictationWords(chunk); } catch (_) { }
              }
          return handled;
        } catch (err) {
          console.error('[ExamPage] commandHandler wrapper error:', err);
          return false;
        }
      };
    } catch (e) { /* ignore */ }

    const heardPrefix = instructionLang === 'ta' ? 'நீங்கள் சொன்னது' : 'You said';

    const clearDictationSilenceTimer = () => {
      if (dictationSilenceTimerRef.current) {
        clearTimeout(dictationSilenceTimerRef.current);
        dictationSilenceTimerRef.current = null;
      }
    };

    const flushDictationWords = async (words = []) => {
      const batch = Array.isArray(words) ? words.filter(Boolean) : [];
      if (!batch.length) return;
      clearDictationSilenceTimer();
      const rawText = batch.join(' ');
      const punctuated = normalizePunctuation(rawText);
      const corrected = await runCorrectionPipeline(punctuated || rawText);
      appendDictation(corrected);
      if (corrected?.trim()) {
        speakWithRecognitionPause(() => speakText(`${heardPrefix}: ${corrected.trim()}`));
      }
    };

    const enqueueDictationWords = async (text = '') => {
      const words = (text || '')
        .replace(/[^a-z0-9\s'-]/gi, ' ')
        .split(/\s+/)
        .filter(Boolean);

      if (!words.length) return;

      dictationBufferRef.current.push(...words);
      clearDictationSilenceTimer();

      while (dictationBufferRef.current.length >= 4) {
        const batch = dictationBufferRef.current.splice(0, 4);
        await flushDictationWords(batch);
      }

      if (dictationBufferRef.current.length) {
        dictationSilenceTimerRef.current = setTimeout(() => {
          const remaining = dictationBufferRef.current.splice(0, dictationBufferRef.current.length);
          void flushDictationWords(remaining);
        }, 2000);
      }
    };

    const normalizePunctuation = (phrase) => {
      if (!phrase) return '';
      const map = [
        { re: /\bfull\s*stop\b/gi, char: '.' },
        { re: /\bperiod\b/gi, char: '.' },
        { re: /\bcomma\b/gi, char: ',' },
        { re: /\bcome\s*on\b/gi, char: ',' },
        { re: /\bcome\s*ah\b/gi, char: ',' },
        { re: /\bcome\s*ma\b/gi, char: ',' },
        { re: /\bquestion\s*mark\b/gi, char: '?' },
        { re: /\bexclamation\s*mark\b/gi, char: '!' },
        { re: /\bcolon\b/gi, char: ':' },
        { re: /\bsemi\s*colon\b/gi, char: ';' },
        { re: /\bopen\s*bracket\b/gi, char: '(' },
        { re: /\bclose\s*bracket\b/gi, char: ')' },
        { re: /\bopen\s*parenthesis\b/gi, char: '(' },
        { re: /\bclose\s*parenthesis\b/gi, char: ')' },
        { re: /\b(inverted\s*commas|double\s*quote|double\s*quotes)\b/gi, char: '"' },
        { re: /\bdash\b/gi, char: '-' },
        { re: /\bem\s*dash\b/gi, char: '—' },
        { re: /\btherefore\b/gi, char: '∴' },
        { re: /\bnew\s*line\b/gi, char: '\n' },
        { re: /\bnew\s*paragraph\b/gi, char: '\n\n' },
      ];
      let out = phrase;
      map.forEach(({ re, char }) => {
        out = out.replace(re, char);
      });
      // Collapse spaces/tabs but preserve newlines inserted above
      return out.replace(/[ \t]+/g, ' ');
    };

    const runCorrectionPipeline = async (text) => {
      const mapped = applyPhoneticMap(text);
      return mapped;
    }; const processTranscript = async (text) => {
      const cleaned = (text || '').trim();
      if (!cleaned) return;

      const segments = cleaned.split(/[.,!?]/).map((s) => s.trim()).filter(Boolean);
      let skipNextQuestionLikeChunk = false;
      const isFiller = (phrase) => {
        const low = phrase.toLowerCase();
        // Drop common false positives from Whisper on silence.
        if (low === 'thank you' || low === 'thankyou' || low === 'thanks' || low === '.') return true;
        if (/^no+$/i.test(low)) return true;
        if (low === 'wait' || low === 'sorry') return true;
        if (/^(yes|yeah|yep|ok|okay|hmm|hmmm|right|fine|alright)$/i.test(low)) return true;
        if (/^(so\s+)?the\s+question\s+is\b/i.test(low) || /^question\s+is\b/i.test(low)) {
          skipNextQuestionLikeChunk = true;
          return true;
        }
        if (skipNextQuestionLikeChunk && /^(what|why|how|when|where|which|who|is|are|can|could|do|does|did)\b/i.test(low)) {
          skipNextQuestionLikeChunk = false;
          return true;
        }
        skipNextQuestionLikeChunk = false;
        return false;
      };
      for (const chunk of segments) {
        if (chunk.length <= 1) continue;
        if (isFiller(chunk)) continue;

        const now = Date.now();
        const gap = now - (lastTranscriptTimestampRef.current || 0);
        lastTranscriptTimestampRef.current = now;

        // Prepare a processed chunk where certain spoken math phrases are converted
        // Examples: "d of x" -> "dx", "is equal to" -> " = "
        let processedChunk = chunk;
        // d of x / d x -> dx (single-letter variable)
        processedChunk = processedChunk.replace(/\bd(?:\s+of)?\s+([a-z])\b/gi, (m, v) => `d${v}`);
        // map equality phrases to =
        processedChunk = processedChunk.replace(/\b(is equal to|is equal|equal to)\b/gi, ' = ');

        const lowerProcessed = processedChunk.trim().toLowerCase();

        // MATHS MODE: If 'solution' or common variants are heard, insert SOLUTION :
        const isMathsMode = student?.subjectMode === 'maths';
        if (isMathsMode && /\b(solutions?|soltuons|solushun|solushan|solushion|solushen|solushon|solushin|colution|solushyan|solushyen)\b/i.test(lowerProcessed)) {
          // Insert uppercase SOLUTION line, leave 2 blank lines, then a single tab indentation
          // Use ::RAW:: prefix so formatting isn't lowercased or altered
          appendDictation('::RAW::\nSOLUTION :\n\n\n\t');
          continue;
        }

        const letterTokens = lowerProcessed.split(/\s+/).filter(Boolean);
        const allowLetterNoise = gap > 1000; // only treat letter-by-letter as noise if there was a 1s pause
        const isLetterByLetterNoise = !spellMode
          && allowLetterNoise
          && letterTokens.length >= 5
          && letterTokens.every((token) => token.length === 1 && /[a-z]/i.test(token));
        if (isLetterByLetterNoise) {
          continue;
        }

        // Always attempt command handling first to avoid dumping commands into answer text
        // Use the processed chunk so mapped phrases (e.g. "is equal to" → "=") don't trigger noisy no-match logs
        const handled = handleCommandChunk(processedChunk);
        if (handled) continue;

        const isMcqQuestion = Array.isArray(currentQuestion?.options) && currentQuestion.options.length;
        if (isMcqQuestion) {
          const letter = detectSpokenOption(chunk);
          if (letter) {
            handleSpokenOption(letter);
            break;
          }
        }

        if (!isMcqQuestion) {
          const navCommands = new Set([
            'repeat', 'skip', 'submit', 'help', 'stop', 'clear', 'delete', 'correct', 'spell', 'previous', 'finish',
            'skip to', 'skip to question', 'next slide', 'previous slide'
          ]);

          const formattingCommands = new Set([
            'comma', 'come on', 'come ah', 'come ma',
            'colon', 'semi-colon', 'semicolon', 'new line', 'new paragraph', 'dot', 'period',
            'open bracket', 'close bracket', 'open parenthesis', 'close parenthesis'
          ]);

          // Full-phrase checks only (no partials like "new")
          if (navCommands.has(lowerProcessed)) {
            continue;
          }

          if (lowerProcessed === 'new line' || lowerProcessed === 'new paragraph' || lowerProcessed === 'next line' || lowerProcessed === 'next paragraph') {
            const isDoubleLine = lowerProcessed === 'new paragraph' || lowerProcessed === 'next paragraph';
            const separator = isDoubleLine ? '\n\n' : '\n';
            capitalizeNextTextRef.current = true;
            appendDictation(separator);
            continue;
          }

          if (formattingCommands.has(lowerProcessed)) {
            const punctuated = normalizePunctuation(processedChunk);
            appendDictation(punctuated);
            continue;
          }

          await enqueueDictationWords(processedChunk);
        }
      }
    };

    const startRecognition = () => {
      if (!examMicRef.current) return;
      stopRecognition();

      // Sequential record (3 s) → Sarvam STT in-browser → process → repeat.
      const recordOneChunk = () => {
        if (cancelled || optionCaptured || !examMicRef.current || showCommandAssistant) {
          console.log('[ExamVoice] Recognition loop paused/halted (Assistant or other reason)');
          return;
        }

        let recorder;
        try {
          recorder = new MediaRecorder(examMicRef.current, { mimeType: 'audio/webm' });
        } catch {
          try { recorder = new MediaRecorder(examMicRef.current); }
          catch (e) { console.warn('[ExamVoice] MediaRecorder unavailable', e); return; }
        }

        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };

        recorder.onstop = async () => {
          if (isTTSPlaying() || showCommandAssistant) {
            console.log('[ExamVoice] Ignoring chunk - TTS playing or Assistant open. HIFI recognition loop halted.');
            // Only recurse if it's JUST TTS, if assistant is open we rely on useEffect rerun to resume
            if (isTTSPlaying() && !showCommandAssistant && !cancelled && !optionCaptured) {
               recordOneChunk();
            }
            return;
          }
          optionRecognitionRef.current = null;
          if (cancelled || optionCaptured) return;
          if (!chunks.length) { setTimeout(recordOneChunk, 100); return; }

          // Force mimeType to plain audio/webm to satisfy Sarvam's allowed list
          const blob = new Blob(chunks, { type: 'audio/webm' });
          if (blob.size < 1000) {
            alert('Recording too short. Please speak for at least 1 second.');
            if (!cancelled && !optionCaptured) {
              recordOneChunk();
            }
            return;
          }
          try {
            const transcript = await sarvamTranscribe(blob, langCode);
            if (transcript) {
                await processTranscript(transcript);
              }
          } catch (err) {
            console.warn('[ExamVoice] STT failed:', err?.message || err);
          }
          if (!cancelled && !optionCaptured) recordOneChunk();
        };

        recorder.onerror = () => {
          optionRecognitionRef.current = null;
          if (!cancelled && !optionCaptured) setTimeout(recordOneChunk, 600);
        };

        try {
          recorder.start();
          optionRecognitionRef.current = recorder;
          // Stop after ~3.2 s to flush the chunk faster
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
          }, 3200);
        } catch (err) {
          console.warn('[ExamVoice] Could not start recorder:', err);
        }
      };

      recordOneChunk();
    };

    const beginQuestionFlow = () => {
      if (sameQuestionRerun) {
        if (VERBOSE_EXAM_PAGE) console.log('[ExamVoice] Starting recognition (rerun same question)');
        startRecognition();
        return;
      }

      // Fresh question: stop any recorder before playing audio
      stopRecognition();

      Promise.resolve(speakQuestionAloud(currentQuestion, state.currentIndex))
        .then(() => {
          return new Promise(resolve => setTimeout(resolve, 1200))
        })
        .then(() => {
          if (!cancelled && !optionCaptured) {
            if (VERBOSE_EXAM_PAGE) console.log('[ExamVoice] Starting recognition after question audio + buffer');
            startRecognition();
          }
        })
        .catch((err) => {
          console.warn('[ExamVoice] Question playback failed, resuming mic', err?.message || err);
          if (!cancelled && !optionCaptured) {
            setTimeout(() => startRecognition(), 1200)
          }
        });
    };

    beginQuestionFlow();
    return () => {
      cancelled = true;
      stopRecognition();
      if (dictationSilenceTimerRef.current) {
        clearTimeout(dictationSilenceTimerRef.current);
        dictationSilenceTimerRef.current = null;
      }
      dictationBufferRef.current = [];
    };
  }, [
    confirmSubmit,
    currentQuestion?.id,
    instructionLang,
    introCompleted,
    jumpToQuestion,
    nextQuestion,
    speakAnswerAloud,
    speakQuestionAloud,
    state.currentIndex,
    state.questions.length,
    student?.registerNo,
    triggerAlarm,
    moveToNextSection,
    spellMode,
    examStarted,
    prevQuestion,
    showCommandAssistant,
  ]);

  if (!examStarted) {
    return (
      <ExamLoadingScreen
        loadingProgress={loadingProgress}
        totalQuestions={totalQuestions}
        cacheReady={cacheReady}
        onReady={() => {
          setExamStarted(true);
          if (state.questions?.length) {
            lastReadQuestionRef.current = state.questions[0].id;
            const firstQuestion = state.questions[0];
            playQuestion(firstQuestion.id, buildQuestionVoiceText(firstQuestion, 0), {
              isMaths: firstQuestion.subject === 'maths',
            });
          }
        }}
      />
    );
  }

  if (!currentQuestion) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>Loading exam…</div>;
  }

  // ─── Layout styles ────────────────────────────────────────────────────────
  const grid = {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gridTemplateRows: '52px 1fr 48px',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg)',
    fontFamily: 'var(--font-sans)',
  };

  const navBtn = {
    padding: '0 20px', border: 'none', borderLeft: '1px solid var(--border)',
    backgroundColor: '#EEE', fontWeight: 'bold', fontSize: 13,
    cursor: 'pointer', textTransform: 'uppercase',
  };

  const submitBtn = {
    padding: '0 24px', border: 'none', borderLeft: '1px solid var(--border)',
    backgroundColor: isCritical ? 'var(--red)' : 'var(--accent)',
    color: 'white', fontWeight: 'bold', fontSize: 13,
    cursor: 'pointer', textTransform: 'uppercase',
  };

  return (
    <div style={grid}>

      {/* ── Header ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 1 }}>
        <ExamHeader
          timeLeft={timeLeft}
          formatted={formatted}
          isWarning={isWarning}
          isCritical={isCritical}
          studentName={student.name}
          regNo={student.registerNo}
          onOpenAssistant={() => setShowCommandAssistant(true)}
        />
      </div>

      {/* hidden video element for gesture detection */}
      <video ref={hiddenVideoRef} style={{ display: 'none' }} autoPlay playsInline muted />

      {/* ── Main: Question + Answer ── */}
      <div style={{ gridColumn: 1, gridRow: 2, display: 'flex', flexDirection: 'column', padding: 24, overflowY: 'auto', overflowX: 'hidden', gap: 16, minWidth: 0 }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--radius-md)', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
          <QuestionPanel
            question={currentQuestion}
            isFlagged={isFlagged}
            onToggleFlag={() => toggleFlag(currentQuestion.id)}
          />
        </div>
        <AnswerBox
          answer={currentAnswer}
          onAnswerChange={(partOrValue, maybeValue) => { /* existing code */ }}
          isActive={mode === 'ANSWER'}
          subjectMode={student.subjectMode}
          questionParts={questionParts}
          activePartKey={activePartKey}
          onActivePartChange={setActivePartKey}
        />
      </div>

      {/* ── Right sidebar: Question palette ── */}
      <div style={{ gridColumn: 2, gridRow: 2, backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)', padding: 16, overflowY: 'auto' }}>
        <QuestionSidebar
          questions={state.questions}
          sections={markSections}
          answers={state.answers}
          flags={state.flags}
          currentIndex={state.currentIndex}
          activeSectionId={activeSectionId}
          onSectionChange={setActiveSectionId}
          videoRef={videoRef}
          activeGesture={activeGesture}
          onJump={jumpToQuestion}
        />
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 3, borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          <ModeStatusBar mode={mode} lastCommand={lastCommand} />
        </div>
        <button style={navBtn} onClick={prevQuestion}>◀ Prev</button>
        <button style={navBtn} onClick={nextQuestion}>Next ▶</button>
        <button style={submitBtn} onClick={submitExam}>Submit Exam</button>
      </div>

      {/* ── Overlays ── */}
      <GestureOverlay lastGesture={activeGesture} />
      {state.isCountdown && <CountdownOverlay seconds={state.countdownSeconds} />}

      {state.isAlarm && (
        <AlarmOverlay
          isVisible={state.isAlarm}
          studentName={student.name}
          questionNo={state.currentIndex + 1}
          onCodeSubmit={dismissAlarm}
          onClose={dismissAlarm}
        />
      )}

      <Modal isOpen={showCommandList} onClose={closeCommandList} title="Voice Command Guide" size="xl">
        <div style={{ lineHeight: 1.5, fontSize: 13, color: 'var(--ink)' }}>
          <p style={{ marginBottom: 14, fontSize: 14, fontStyle: 'italic', color: 'var(--accent)' }}>
            Sure! Here is a list of my voice commands. Listen for the one you need:
          </p>

          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: 'var(--accent)' }}>QUESTION NAVIGATION:</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• NEXT QUESTION</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• PREVIOUS QUESTION</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• SKIP</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• GO TO QUESTION NUMBER</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• SKIP TO QUESTION NUMBER</li>
            </ul>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: 'var(--accent)' }}>ANSWER WRITING CONTROL:</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• START ANSWER</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• STOP ANSWER</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• CLEAR</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• DELETE ANSWER</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• DELETE LAST NUMBER WORDS</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• ADD POINT</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• NEW LINE</li>
            </ul>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: 'var(--accent)' }}>ACCESSIBILITY / REPEAT:</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• REPEAT QUESTION</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• REPEAT ANSWER</li>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• REPEAT OPTIONS</li>
            </ul>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: 'var(--accent)' }}>TIME AND STATUS:</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• TIME LEFT</li>
            </ul>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: 'var(--accent)' }}>HELP:</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              <li style={{ paddingLeft: 16, marginBottom: 3 }}>• HELP HELP HELP</li>
            </ul>
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--ink3)' }}>
            Say "list commands" to open this guide anytime while in the exam.
          </div>
        </div>
      </Modal>

      {state.showSecurityModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: 40, borderRadius: 'var(--radius-md)', maxWidth: 400, width: '90%' }}>
            <h2 style={{ marginBottom: 8, fontSize: 18 }}>Confirm Submission</h2>
            <p style={{ marginBottom: 24, fontSize: 14, color: 'var(--ink3)' }}>
              Enter the Supervisor Security Code (default: <strong>12345</strong>) to submit the exam.
            </p>
            <SecurityCodeModal onCorrectCode={confirmSubmit} onClose={() => { }} embed={false} />
          </div>
        </div>
      )}

      {/* ── MALPRACTICE MODAL — only closes with code 12345 ── */}
      {malpractice && (
        <MalpracticeModal
          isOpen={!!malpractice}
          evidence={malpractice}
          onClose={() => setMalpractice(null)}
        />
      )}

      <CommandAssistant
        isOpen={showCommandAssistant}
        onClose={() => setShowCommandAssistant(false)}
        studentLang={student?.instructionLang}
        micStream={examMicRef.current}
      />

      {/* ── Math Renderer Modal (for Maths Mode) ── */}
      <Modal
        isOpen={showMathModal}
        onClose={() => setShowMathModal(false)}
        title="Equation Display"
        size="lg"
      >
        <div style={{ padding: '16px' }}>
          <MathRenderer
            latex={currentMathLatex}
            onClear={() => {
              setCurrentMathLatex('');
              setShowMathModal(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

