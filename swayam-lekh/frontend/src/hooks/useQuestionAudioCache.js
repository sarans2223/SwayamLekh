import { useRef, useState, useCallback, useEffect } from 'react'
import { latexToSpeakable } from '../utils/latexToSpeakable'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

export function useQuestionAudioCache() {
  const audioCache = useRef({})
  const objectUrls = useRef(new Set())
  const preloadRunRef = useRef({ key: '', inFlight: false })
  const sarvamRateStateRef = useRef({
    lastRequestTs: 0,
    backoffUntilTs: 0,
  })
  const openAIFallbackDisabledRef = useRef(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [cacheReady, setCacheReady] = useState(false)
  const [cacheError, setCacheError] = useState(null)
  const currentAudioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
        currentAudioRef.current = null
      }

      objectUrls.current.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      objectUrls.current.clear()
    }
  }, [])

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  async function fetchOpenAISpeak(text) {
    if (openAIFallbackDisabledRef.current) return null

    const response = await fetch(`${BACKEND_URL}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'nova' })
    });

    if (!response.ok) {
      let body = ''
      try {
        body = await response.text()
      } catch (_) {
        body = ''
      }

      // If endpoint/config is missing, stop retrying OpenAI fallback for this session.
      if (response.status === 404 || response.status === 500) {
        openAIFallbackDisabledRef.current = true
      }

      throw new Error(`OpenAI fallback failed (${response.status}): ${body}`)
    }

    const data = await response.json();
    return data?.audio || null;
  }

  async function fetchQuestionAudio(questionText, { isMaths = false } = {}, retryCount = 0) {
    const speakableText = latexToSpeakable(questionText)
    const MIN_REQUEST_GAP_MS = 1400
    
    // Tier 1: Sarvam
    try {
      const now = Date.now()
      const rateState = sarvamRateStateRef.current
      const gapWait = Math.max(0, MIN_REQUEST_GAP_MS - (now - rateState.lastRequestTs))
      const backoffWait = Math.max(0, rateState.backoffUntilTs - now)
      const waitMs = Math.max(gapWait, backoffWait)
      if (waitMs > 0) {
        await wait(waitMs)
      }

      sarvamRateStateRef.current.lastRequestTs = Date.now()
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': import.meta.env.VITE_SARVAM_API_KEY,
        },
        body: JSON.stringify({
          inputs: [speakableText],
          target_language_code: 'en-IN',
          speaker: 'anushka',
          pitch: 0,
          pace: isMaths ? 0.75 : 0.85,
          loudness: 1.5,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: 'bulbul:v2'
        })
      })

      if (response.status === 429 && retryCount < 3) {
        const retryAfterHeader = Number(response.headers.get('retry-after'))
        const headerBackoff = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader * 1000 : 0
        const expBackoff = Math.pow(2, retryCount) * 1000
        const jitter = Math.floor(Math.random() * 350)
        const backoff = Math.max(headerBackoff, expBackoff + jitter)
        sarvamRateStateRef.current.backoffUntilTs = Date.now() + backoff
        console.warn(`Sarvam 429: Rate limited. Retrying in ${backoff}ms...`);
        await wait(backoff);
        return fetchQuestionAudio(questionText, { isMaths }, retryCount + 1);
      }

      sarvamRateStateRef.current.backoffUntilTs = 0

      if (!response.ok) {
        throw new Error(`Sarvam error: ${response.status}`)
      }

      const data = await response.json()
      return data.audios[0]
    } catch (err) {
      // Tier 2: OpenAI Fallback (only on specific errors or after retries)
      console.warn(`Tier 1 (Sarvam) failed for question audio, trying Tier 2 (OpenAI Fallback)`);
      try {
        const fallbackAudio = await fetchOpenAISpeak(speakableText)
        if (!fallbackAudio) {
          return null
        }
        return fallbackAudio
      } catch (fallbackErr) {
        console.error('All high-quality TTS tiers failed; browser speech will be used:', fallbackErr);
        return null
      }
    }
  }

  function createQuestionAudioEntry(base64Audio) {
    const src = buildAudioSrc(base64Audio)
    if (!src) return null

    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.load()

    if (src.startsWith('blob:')) {
      objectUrls.current.add(src)
    }

    return { src, audio }
  }

  function storeQuestionAudio(questionId, base64Audio) {
    const previousEntry = audioCache.current[questionId]
    if (previousEntry?.src?.startsWith('blob:')) {
      objectUrls.current.delete(previousEntry.src)
      URL.revokeObjectURL(previousEntry.src)
    }

    const entry = createQuestionAudioEntry(base64Audio)
    audioCache.current[questionId] = entry
    return entry
  }

  const preloadAllQuestions = useCallback(async (questions) => {
    const preloadKey = (questions || []).map((q) => `${q.id}:${q.isMaths ? '1' : '0'}`).join('|')
    if (preloadRunRef.current.inFlight && preloadRunRef.current.key === preloadKey) {
      return
    }

    preloadRunRef.current = { key: preloadKey, inFlight: true }

    setTotalQuestions(questions.length)
    setLoadingProgress(0)
    setCacheReady(false)
    setCacheError(null)

    let loaded = 0

    try {
      for (const question of questions) {
        try {
          // Keep a deliberate gap between items so preload doesn't burst TTS calls.
          if (loaded > 0) await wait(450)

          const base64Audio = await fetchQuestionAudio(question.text, { isMaths: !!question.isMaths })
          storeQuestionAudio(question.id, base64Audio)
          loaded++
          setLoadingProgress(loaded)
        } catch (error) {
          console.error(`Failed to preload question ${question.id}:`, error)
          audioCache.current[question.id] = null
          loaded++
          setLoadingProgress(loaded)
          setCacheError(error)
        }
      }
    } finally {
      preloadRunRef.current.inFlight = false
    }

    setCacheReady(true)
  }, [])

  const playQuestion = useCallback(async (questionId, questionText, { isMaths = false } = {}) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }

    const playFromEntry = (entry) => new Promise((resolve) => {
      if (!entry?.src) {
        browserSpeak(questionText, { isMaths }).finally(resolve)
        return
      }

      const audio = new Audio(entry.src)
      audio.preload = 'auto'
      audio.currentTime = 0
      audio.volume = 1
      audio.muted = false
      currentAudioRef.current = audio

      let settled = false
      let started = false
      const settle = () => {
        if (settled) return
        settled = true
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null
        }
        resolve()
      }

      const fallbackToBrowserTTS = () => {
        browserSpeak(questionText, { isMaths }).finally(settle)
      }

      audio.onplaying = () => {
        started = true
      }
      audio.onended = settle
      audio.onerror = (err) => {
        console.warn(`Audio playback error for question ${questionId}:`, err)
        fallbackToBrowserTTS()
      }

      const startupWatchdog = setTimeout(() => {
        if (!started && audio.paused) {
          console.warn(`Audio startup timeout for question ${questionId}; falling back to browser TTS`)
          fallbackToBrowserTTS()
        }
      }, 1500)

      const clearWatchdog = () => clearTimeout(startupWatchdog)
      const originalOnPlaying = audio.onplaying
      const originalOnEnded = audio.onended
      const originalOnError = audio.onerror
      audio.onplaying = (...args) => {
        clearWatchdog()
        if (typeof originalOnPlaying === 'function') originalOnPlaying(...args)
      }
      audio.onended = (...args) => {
        clearWatchdog()
        if (typeof originalOnEnded === 'function') originalOnEnded(...args)
      }
      audio.onerror = (...args) => {
        clearWatchdog()
        if (typeof originalOnError === 'function') originalOnError(...args)
      }

      audio.play().catch((err) => {
        clearWatchdog()
        console.warn(`Audio play promise rejected for question ${questionId}:`, err)
        fallbackToBrowserTTS()
      })
    })

    const entry = audioCache.current[questionId]

    if (entry) {
      console.log(`Audio cache hit for question ${questionId}`)
      return playFromEntry(entry)
    }

    console.warn(`Cache miss for question ${questionId} — calling Sarvam live`)
    try {
      const base64Live = await fetchQuestionAudio(questionText, { isMaths })
      const liveEntry = storeQuestionAudio(questionId, base64Live)
      console.log(`Live fetch stored for question ${questionId}`)
      return playFromEntry(liveEntry)
    } catch (error) {
      console.error(`Sarvam live fetch failed for question ${questionId}:`, error)
      return browserSpeak(questionText, { isMaths })
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
    }
  }, [])

  return {
    preloadAllQuestions,
    playQuestion,
    stopAudio,
    loadingProgress,
    totalQuestions,
    cacheReady,
    cacheError
  }
}

function browserSpeak(text, { isMaths = false } = {}) {
  const synth = window.speechSynthesis

  return new Promise((resolve) => {
    if (!synth) {
      resolve()
      return
    }

    synth.cancel()
    const utt = new SpeechSynthesisUtterance(latexToSpeakable(text))
    utt.lang = 'en-IN'
    utt.rate = isMaths ? 0.75 : 0.82
    utt.pitch = 1

    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const safety = setTimeout(done, 12000)
    utt.onend = () => {
      clearTimeout(safety)
      done()
    }
    utt.onerror = () => {
      clearTimeout(safety)
      done()
    }

    synth.speak(utt)
  })
}

function buildAudioSrc(base64) {
  if (!base64) return null
  if (base64.startsWith('data:') || base64.startsWith('blob:')) return base64
  const looksWav = base64.startsWith('UklG') // "RIFF" in base64
  const mime = looksWav ? 'audio/wav' : 'audio/mpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mime })
  return URL.createObjectURL(blob)
}
