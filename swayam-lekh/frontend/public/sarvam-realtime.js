const BACKEND_URL = 'http://localhost:5000/api';
const constraints = {
  audio: {
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
  },
};
const LOW_VOLUME_THRESHOLD = 0.011;
const NOISE_ALERT_THRESHOLD = 0.08;
const MAX_SEGMENT_MS = 1400;
const PAUSE_THRESHOLD_MS = 520;
const MIN_SPEECH_RMS = 0.016;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const langSelect = document.getElementById('langSelect');
const statusText = document.getElementById('statusText');
const speechState = document.getElementById('speechState');
const confidenceText = document.getElementById('confidenceText');
const attentionText = document.getElementById('attentionText');
const transcriptEl = document.getElementById('transcript');
const waveformCanvas = document.getElementById('waveform');
const waveformCtx = waveformCanvas.getContext('2d');

const state = {
  audioContext: null,
  analyser: null,
  processor: null,
  source: null,
  stream: null,
  bufferQueue: [],
  speechActive: false,
  lastSpeechAt: 0,
  segmentStartAt: 0,
  baselineRms: 0.001,
  sending: false,
  totalTranscript: '',
};

startBtn.addEventListener('click', startListening);
stopBtn.addEventListener('click', stopListening);

function updateStatus(text) {
  statusText.textContent = text;
}

function updateSpeechState(active) {
  speechState.textContent = active ? 'Speaking' : 'Waiting';
}

function updateAttention(text) {
  attentionText.textContent = text;
}

function updateConfidence(value) {
  confidenceText.textContent = value != null ? `${Math.round(value * 100)}%` : '—';
}

function appendTranscript(text, source = 'Sarvam') {
  if (!text) return;
  state.totalTranscript += `${text.trim()} `;
  transcriptEl.textContent = state.totalTranscript.trim();
  updateStatus(`Received from ${source}`);
}

function resetTranscript() {
  state.totalTranscript = '';
  transcriptEl.textContent = '';
  updateConfidence(null);
}

function resetPipeline() {
  state.bufferQueue = [];
  state.speechActive = false;
  state.lastSpeechAt = 0;
  state.segmentStartAt = 0;
  state.baselineRms = 0.001;
  state.sending = false;
}

async function startListening() {
  resetPipeline();
  resetTranscript();
  updateStatus('Requesting microphone access...');

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    state.stream = stream;
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });

    if (state.audioContext.state === 'suspended') {
      await state.audioContext.resume();
    }

    state.source = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;
    state.source.connect(state.analyser);

    state.processor = state.audioContext.createScriptProcessor(4096, 1, 1);
    const zeroGain = state.audioContext.createGain();
    zeroGain.gain.value = 0;
    state.source.connect(state.processor);
    state.processor.connect(zeroGain);
    zeroGain.connect(state.audioContext.destination);
    state.processor.onaudioprocess = handleAudioProcess;

    state.segmentStartAt = performance.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus('Listening for speech...');
    updateSpeechState(false);
    drawWaveform();
  } catch (error) {
    console.error(error);
    updateStatus('Microphone permission denied or unsupported.');
  }
}

function stopListening() {
  if (state.processor) {
    state.processor.disconnect();
    state.processor.onaudioprocess = null;
  }
  if (state.source) {
    state.source.disconnect();
  }
  if (state.analyser) {
    state.analyser.disconnect();
  }
  if (state.audioContext) {
    state.audioContext.close().catch(() => {});
  }
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }

  if (state.speechActive && state.bufferQueue.length) {
    flushSpeechChunk(false);
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
  updateStatus('Stopped');
  updateSpeechState(false);
}

function handleAudioProcess(event) {
  const inputBuffer = event.inputBuffer;
  const inputData = inputBuffer.numberOfChannels > 0 ? inputBuffer.getChannelData(0) : new Float32Array(inputBuffer.length);
  const monoInput = convertToMono(inputBuffer);
  const rms = calculateRms(monoInput);
  state.baselineRms = state.baselineRms * 0.96 + rms * 0.04;

  const threshold = Math.max(MIN_SPEECH_RMS, state.baselineRms * 4.5);
  const isSpeech = rms >= threshold;

  if (isSpeech) {
    if (!state.speechActive) {
      state.speechActive = true;
      state.segmentStartAt = performance.now();
      updateStatus('Speech detected, capturing chunk...');
      updateSpeechState(true);
    }

    state.bufferQueue.push(new Float32Array(monoInput));
    state.lastSpeechAt = performance.now();

    if (performance.now() - state.segmentStartAt >= MAX_SEGMENT_MS) {
      flushSpeechChunk(true);
      state.segmentStartAt = performance.now();
    }
  } else if (state.speechActive && performance.now() - state.lastSpeechAt >= PAUSE_THRESHOLD_MS) {
    flushSpeechChunk(false);
    state.speechActive = false;
    updateSpeechState(false);
  }

  if (rms < LOW_VOLUME_THRESHOLD) {
    updateAttention('Speak louder');
  } else if (state.baselineRms > NOISE_ALERT_THRESHOLD && !state.speechActive) {
    updateAttention('Noise detected');
  } else {
    updateAttention('Normal');
  }
}

function convertToMono(buffer) {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }

  const channelCount = buffer.numberOfChannels;
  const length = buffer.length;
  const result = new Float32Array(length);

  for (let channel = 0; channel < channelCount; channel += 1) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      result[i] += channelData[i];
    }
  }

  for (let i = 0; i < length; i += 1) {
    result[i] /= channelCount;
  }

  return result;
}

function calculateRms(float32Array) {
  let sum = 0;
  for (let i = 0; i < float32Array.length; i += 1) {
    sum += float32Array[i] * float32Array[i];
  }
  return Math.sqrt(sum / float32Array.length);
}

function flushSpeechChunk(isPartial) {
  if (!state.bufferQueue.length) {
    state.speechActive = false;
    return;
  }

  const merged = mergeBuffers(state.bufferQueue);
  state.bufferQueue = [];
  state.sending = true;
  updateStatus(isPartial ? 'Sending partial speech chunk...' : 'Sending final speech chunk...');

  transcribeChunk(merged, langSelect.value, isPartial)
    .catch((error) => {
      console.error('Transcription error', error);
      updateStatus('Transcription error; trying fallback.');
    })
    .finally(() => {
      state.sending = false;
    });
}

function mergeBuffers(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(length);
  let offset = 0;

  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
}

async function transcribeChunk(samples, language, isPartial) {
  const normalized = normalizeAudio(samples, 0.95);
  const resampled = resampleTo16k(normalized, state.audioContext.sampleRate);
  const wavBlob = encodeWav(resampled, 16000);

  try {
    updateStatus('Sending audio to Sarvam...');
    const result = await callSarvamStt(wavBlob, language);

    if (!result.transcript || (result.confidence && result.confidence < 0.55)) {
      updateStatus('Low Sarvam confidence or empty transcript; trying Whisper fallback...');
      const fallbackText = await fallbackToWhisper(wavBlob, language);
      if (fallbackText) {
        appendTranscript(fallbackText, 'Whisper');
      }
      return;
    }

    updateConfidence(result.confidence);
    appendTranscript(result.transcript, 'Sarvam');
  } catch (primaryError) {
    console.warn('Sarvam primary error:', primaryError);
    updateStatus('Sarvam failed; falling back to Whisper...');
    const fallbackText = await fallbackToWhisper(wavBlob, language);
    if (fallbackText) {
      appendTranscript(fallbackText, 'Whisper');
    }
  }
}

async function callSarvamStt(blob, language) {
  const formData = new FormData();
  formData.append('audio', blob, 'speech.wav');
  formData.append('language_code', language);
  formData.append('model', 'whisper-large-v3');

  const response = await fetch(`${BACKEND_URL}/sarvam-stt`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => 'No response body');
    throw new Error(`Sarvam STT request failed: ${response.status} ${details}`);
  }

  const json = await response.json();
  return {
    transcript: json.transcript || '',
    confidence: typeof json.confidence === 'number' ? json.confidence : null,
  };
}

async function fallbackToWhisper(blob, language) {
  const browserTranscript = await browserSpeechRecognition(language).catch(() => '');
  if (browserTranscript) {
    return browserTranscript;
  }

  try {
    const formData = new FormData();
    formData.append('audio', blob, 'fallback.wav');
    formData.append('language_code', language);
    const response = await fetch(`${BACKEND_URL}/whisper`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'No response body');
      throw new Error(`Whisper fallback failed: ${response.status} ${text}`);
    }

    const json = await response.json();
    return json.transcript || '';
  } catch (error) {
    console.error('Whisper fallback error:', error);
    updateStatus('Whisper fallback failed.');
    return '';
  }
}

function browserSpeechRecognition(language) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return reject(new Error('Browser SpeechRecognition API unavailable.'));
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let finished = false;
    const timeout = window.setTimeout(() => {
      if (!finished) {
        recognition.abort();
        finished = true;
        reject(new Error('Browser recognition timeout.'));
      }
    }, 7000);

    recognition.onresult = (event) => {
      finished = true;
      window.clearTimeout(timeout);
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      resolve(transcript);
    };

    recognition.onerror = (event) => {
      if (!finished) {
        finished = true;
        window.clearTimeout(timeout);
        reject(new Error(event.error || 'SpeechRecognition error'));
      }
    };

    recognition.onend = () => {
      if (!finished) {
        finished = true;
        window.clearTimeout(timeout);
        reject(new Error('SpeechRecognition ended without result.'));
      }
    };

    try {
      recognition.start();
    } catch (error) {
      finished = true;
      window.clearTimeout(timeout);
      reject(error);
    }
  });
}

function normalizeAudio(samples, targetPeak = 0.95) {
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    max = Math.max(max, Math.abs(samples[i]));
  }

  if (max < 1e-6) {
    return samples;
  }

  const scale = targetPeak / max;
  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    normalized[i] = Math.max(-1, Math.min(1, samples[i] * scale));
  }
  return normalized;
}

function resampleTo16k(samples, sourceSampleRate) {
  if (sourceSampleRate === 16000) {
    return samples;
  }

  const targetSampleRate = 16000;
  const resampleRatio = sourceSampleRate / targetSampleRate;
  const length = Math.round(samples.length / resampleRatio);
  const result = new Float32Array(length);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < length) {
    const nextOffsetBuffer = offsetResult * resampleRatio;
    const lowerIndex = Math.floor(nextOffsetBuffer);
    const upperIndex = Math.min(samples.length - 1, lowerIndex + 1);
    const weight = nextOffsetBuffer - lowerIndex;
    result[offsetResult] = samples[lowerIndex] * (1 - weight) + samples[upperIndex] * weight;
    offsetResult += 1;
  }

  return result;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i += 1, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    output.setInt16(offset, s, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function drawWaveform() {
  if (!state.analyser) {
    return;
  }

  requestAnimationFrame(drawWaveform);
  const bufferLength = state.analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  state.analyser.getByteTimeDomainData(dataArray);

  waveformCtx.fillStyle = '#0f172a';
  waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  waveformCtx.lineWidth = 2;
  waveformCtx.strokeStyle = '#38bdf8';
  waveformCtx.beginPath();

  const sliceWidth = waveformCanvas.width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i += 1) {
    const v = dataArray[i] / 128.0;
    const y = (v * waveformCanvas.height) / 2;
    if (i === 0) {
      waveformCtx.moveTo(x, y);
    } else {
      waveformCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  waveformCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
  waveformCtx.stroke();
}

window.addEventListener('beforeunload', stopListening);
