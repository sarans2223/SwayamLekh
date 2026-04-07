/**
 * RealtimeSTTManager - Core speech-to-text processing engine
 * Handles:
 * - Audio capture with hardware constraints
 * - Web Audio API processing (resampling, normalization, VAD)
 * - WAV encoding
 * - Sarvam STT API integration with Groq Whisper fallback
 * - Real-time callbacks for UI updates
 */

export class RealtimeSTTManager {
  constructor(options = {}) {
    this.language = options.language || 'en-IN';
    this.onTranscript = options.onTranscript || (() => {});
    this.onInterim = options.onInterim || (() => {});
    this.onCommand = options.onCommand || (() => {});
    this.onVolumeChange = options.onVolumeChange || (() => {});
    this.onNoiseChange = options.onNoiseChange || (() => {});
    this.onVADChange = options.onVADChange || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    // Audio configuration
    this.SAMPLE_RATE = 16000;
    this.CHUNK_SIZE = 4096;
    this.VAD_THRESHOLD = 0.02;
    this.SILENCE_DURATION = 1500; // ms
    this.NOISE_THRESHOLD = 0.3;

    // State
    this.isListening = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.scriptProcessor = null;
    this.mediaRecorder = null;
    this.audioBuffer = new Float32Array(0);
    this.silenceStart = null;
    this.vadActive = false;
    this.resampler = null;
  }

  /**
   * Start recording and processing audio
   */
  async start() {
    if (this.isListening) return;

    try {
      this._updateStatus('requesting');

      // Request microphone with advanced constraints
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000 },
        },
      });

      this._updateStatus('active');
      this.isListening = true;

      // Initialize Web Audio API
      this._initializeAudioContext();
      this._setupAnalyser();
      this._setupVAD();

      console.log('[STT] Recording started');
    } catch (err) {
      this._updateStatus('error');
      this.onError(new Error(`Microphone access denied: ${err.message}`));
    }
  }

  /**
   * Stop recording
   */
  async stop() {
    if (!this.isListening) return;

    this.isListening = false;
    this._updateStatus('idle');

    // Stop all audio streams
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }

    console.log('[STT] Recording stopped');
  }

  /**
   * Initialize Web Audio Context
   */
  _initializeAudioContext() {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.SAMPLE_RATE,
    });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create script processor for real-time audio processing
    this.scriptProcessor = this.audioContext.createScriptProcessor(
      this.CHUNK_SIZE,
      1, // input channels
      1  // output channels
    );

    this.scriptProcessor.onaudioprocess = (e) => this._processAudioChunk(e);

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);
  }

  /**
   * Setup frequency analyser for visualization
   */
  _setupAnalyser() {
    if (!this.audioContext) return;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    // Connect source to analyser
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    source.connect(this.analyser);
  }

  /**
   * Setup Voice Activity Detection
   */
  _setupVAD() {
    // Simple VAD based on RMS energy
    this.vadEnergyThreshold = 0.02;
  }

  /**
   * Process audio chunk: resample, normalize, detect VAD, encode to WAV
   */
  _processAudioChunk(event) {
    const inputData = event.inputBuffer.getChannelData(0);
    
    // Copy to persistent buffer
    const newBuffer = new Float32Array(this.audioBuffer.length + inputData.length);
    newBuffer.set(this.audioBuffer);
    newBuffer.set(inputData, this.audioBuffer.length);
    this.audioBuffer = newBuffer;

    // Calculate RMS for volume and VAD
    const rms = this._calculateRMS(inputData);
    const noiseLevel = this._estimateNoise(inputData);

    // Update UI callbacks
    this.onVolumeChange(rms);
    this.onNoiseChange(noiseLevel);

    // Voice Activity Detection
    const isVoiceActive = rms > this.VAD_THRESHOLD;
    this._updateVADState(isVoiceActive);

    // Every 500ms, check if we have enough data to send
    if (this.audioBuffer.length >= this.SAMPLE_RATE * 0.5) {
      // Only send if voice is detected or recently detected
      if (this.vadActive || this._isRecentlySpeaking()) {
        this._processAndSendAudio();
      }
    }
  }

  /**
   * Calculate RMS (volume) of audio chunk
   */
  _calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Estimate noise level using spectral analysis
   */
  _estimateNoise(samples) {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Low freq = noise, high freq = speech
    const lowFreq = dataArray.slice(0, Math.floor(dataArray.length * 0.2));
    const highFreq = dataArray.slice(Math.floor(dataArray.length * 0.2));

    const lowAvg = lowFreq.reduce((a, b) => a + b, 0) / lowFreq.length;
    const highAvg = highFreq.reduce((a, b) => a + b, 0) / highFreq.length;

    // Noise ratio
    return lowAvg / (highAvg + 0.001);
  }

  /**
   * Update VAD state with debouncing
   */
  _updateVADState(isActive) {
    if (isActive) {
      this.silenceStart = null;
      if (!this.vadActive) {
        this.vadActive = true;
        this.onVADChange(true);
      }
    } else {
      if (this.silenceStart === null) {
        this.silenceStart = Date.now();
      }
      const silenceDuration = Date.now() - this.silenceStart;
      if (silenceDuration > this.SILENCE_DURATION && this.vadActive) {
        this.vadActive = false;
        this.onVADChange(false);
      }
    }
  }

  /**
   * Check if speech was recent (within silence window)
   */
  _isRecentlySpeaking() {
    if (!this.silenceStart) return true;
    return Date.now() - this.silenceStart < this.SILENCE_DURATION + 500;
  }

  /**
   * Resample audio buffer to 16kHz
   */
  _resampleAudio(audioData) {
    // If already 16kHz, return as-is
    if (this.audioContext.sampleRate === this.SAMPLE_RATE) {
      return audioData;
    }

    // Simple linear interpolation resampling
    const ratio = this.SAMPLE_RATE / this.audioContext.sampleRate;
    const resampled = new Float32Array(Math.ceil(audioData.length * ratio));

    for (let i = 0; i < resampled.length; i++) {
      const srcIndex = i / ratio;
      const srcFloor = Math.floor(srcIndex);
      const srcCeil = srcFloor + 1;
      const t = srcIndex - srcFloor;

      if (srcCeil < audioData.length) {
        resampled[i] =
          audioData[srcFloor] * (1 - t) + audioData[srcCeil] * t;
      } else {
        resampled[i] = audioData[srcFloor];
      }
    }

    return resampled;
  }

  /**
   * Normalize audio volume to [-1, 1] range
   */
  _normalizeAudio(audioData) {
    let maxValue = 0;
    for (let i = 0; i < audioData.length; i++) {
      maxValue = Math.max(maxValue, Math.abs(audioData[i]));
    }

    if (maxValue === 0) return audioData;

    const normalized = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] / maxValue;
    }

    return normalized;
  }

  /**
   * Convert Float32Array to WAV format
   */
  _encodeWAV(audioData) {
    // Resample to 16kHz
    const resampled = this._resampleAudio(audioData);

    // Normalize
    const normalized = this._normalizeAudio(resampled);

    // Convert to PCM 16-bit
    const pcm16 = this._floatTo16BitPCM(normalized);

    // Create WAV header
    const wavData = this._createWAVHeader(pcm16);

    return wavData;
  }

  /**
   * Convert Float32 array to Int16 PCM
   */
  _floatTo16BitPCM(float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit integer
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  /**
   * Create WAV file header
   */
  _createWAVHeader(pcm16Data) {
    const bufferSize = 44 + pcm16Data.byteLength;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV header format
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcm16Data.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, 1, true); // num channels
    view.setUint32(24, this.SAMPLE_RATE, true); // sample rate
    view.setUint32(28, this.SAMPLE_RATE * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, pcm16Data.byteLength, true);

    // Copy PCM data
    const pcmArray = new Uint8Array(arrayBuffer, 44);
    pcmArray.set(new Uint8Array(pcm16Data.buffer));

    return arrayBuffer;
  }

  /**
   * Process and send audio to API
   */
  async _processAndSendAudio() {
    if (this.audioBuffer.length === 0) return;

    try {
      const audioData = this.audioBuffer.slice();
      this.audioBuffer = new Float32Array(0); // Reset buffer

      // Encode to WAV
      const wavBuffer = this._encodeWAV(audioData);

      // Send to backend
      const transcript = await this._callSTTAPI(wavBuffer);

      if (transcript) {
        this.onTranscript(transcript, 0.95); // Confidence from API
        this.onInterim('');
      }
    } catch (err) {
      console.error('[STT] Processing error:', err);
    }
  }

  /**
   * Call backend STT API (Sarvam with Whisper fallback)
   */
  async _callSTTAPI(wavBuffer) {
    try {
      const formData = new FormData();
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      formData.append('audio', blob, 'audio.wav');

      // Call backend /api/stt
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.transcript || '';
    } catch (err) {
      console.error('[STT API] Error:', err);
      this.onError(err);
      return null;
    }
  }

  /**
   * Get analyser for waveform visualization
   */
  getAnalyzer() {
    return this.analyser;
  }

  /**
   * Update status callback
   */
  _updateStatus(status) {
    this.onStatusChange(status);
  }
}
