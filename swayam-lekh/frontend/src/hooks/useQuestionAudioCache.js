import { useRef, useState, useCallback, useEffect } from 'react'

export function useQuestionAudioCache() {
  const audioCache = useRef({})
  const objectUrls = useRef(new Set())
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

  async function fetchQuestionAudio(questionText) {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': import.meta.env.VITE_SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [questionText],
        target_language_code: 'en-IN',
        speaker: 'anushka',
        pitch: 0,
        pace: 0.95,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v2'
      })
    })

    if (!response.ok) {
      throw new Error(`Sarvam error: ${response.status}`)
    }

    const data = await response.json()
    return data.audios[0]
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
    setTotalQuestions(questions.length)
    setLoadingProgress(0)
    setCacheReady(false)
    setCacheError(null)

    let loaded = 0

    for (const question of questions) {
      try {
        const base64Audio = await fetchQuestionAudio(question.text)
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

    setCacheReady(true)
  }, [])

  const playQuestion = useCallback(async (questionId, questionText) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
    }

    const playFromEntry = (entry) => new Promise((resolve) => {
      if (!entry?.src) {
        browserSpeak(questionText)
        resolve()
        return
      }

      const audio = entry.audio || new Audio(entry.src)
      audio.preload = 'auto'
      audio.load()
      audio.currentTime = 0
      currentAudioRef.current = audio
      audio.onended = resolve
      audio.onerror = (err) => {
        console.warn(`Audio playback error for question ${questionId}:`, err)
        browserSpeak(questionText)
        resolve()
      }
      audio.play().catch((err) => {
        console.warn(`Audio play promise rejected for question ${questionId}:`, err)
        browserSpeak(questionText)
        resolve()
      })
    })

    const entry = audioCache.current[questionId]

    if (entry) {
      console.log(`Audio cache hit for question ${questionId}`)
      return playFromEntry(entry)
    }

    console.warn(`Cache miss for question ${questionId} — calling Sarvam live`)
    try {
      const base64Live = await fetchQuestionAudio(questionText)
      const liveEntry = storeQuestionAudio(questionId, base64Live)
      console.log(`Live fetch stored for question ${questionId}`)
      return playFromEntry(liveEntry)
    } catch (error) {
      console.error(`Sarvam live fetch failed for question ${questionId}:`, error)
      browserSpeak(questionText)
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

function browserSpeak(text) {
  const synth = window.speechSynthesis
  synth.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-IN'
  utt.rate = 0.9
  utt.pitch = 1
  synth.speak(utt)
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
