/**
 * audioFingerprint.js
 * Pure Web Audio API voice feature extraction + comparison.
 * No external libraries — works entirely in Chrome's built-in AudioContext.
 */

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract voice biometric features from an audio Blob.
 * @param {Blob} audioBlob
 * @returns {Promise<{mfcc, pitch_mean, pitch_std, energy_mean, zcr, spectral_centroid}>}
 */
export async function extractFeatures(audioBlob) {
  const audioCtx    = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);        // raw PCM Float32Array
  const sampleRate  = audioBuffer.sampleRate;

  const zcr               = computeZCR(channelData);
  const energy_mean       = computeEnergy(channelData);
  const { mean: pitch_mean, std: pitch_std } = computePitch(channelData, sampleRate);
  const spectral_centroid = computeSpectralCentroid(channelData, sampleRate);
  const mfcc              = computeMFCC(channelData, sampleRate);

  audioCtx.close();

  return { mfcc, pitch_mean, pitch_std, energy_mean, zcr, spectral_centroid };
}

/**
 * Compare two feature sets and return a similarity score 0-100.
 * Score < 65 → mismatch → trigger alarm.
 * @param {object} stored  - features from DB
 * @param {object} live    - features just extracted
 * @returns {{ similarity: number, passed: boolean }}
 */
export function compareFeatures(stored, live) {
  if (!stored || !live) return { similarity: 0, passed: false };

  const WEIGHTS = {
    mfcc:              0.40,
    pitch_mean:        0.20,
    pitch_std:         0.15,
    energy_mean:       0.10,
    zcr:               0.10,
    spectral_centroid: 0.05,
  };

  const THRESHOLD = 55;  // Lowered from 65 for better sensitivity to softer voices

  // Safe scalar distance, clamped 0→1 (0 = identical)
  const scalarDist = (a, b, scale) => {
    if (a == null || b == null) return 1;
    return Math.min(Math.abs(a - b) / scale, 1);
  };

  // MFCC vector cosine similarity → distance
  const mfccDist = (() => {
    const a = stored.mfcc;
    const b = live.mfcc;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 1;
    const dot  = a.reduce((s, v, i) => s + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    if (magA === 0 || magB === 0) return 1;
    const cosine = dot / (magA * magB);        // −1 → +1
    return (1 - cosine) / 2;                   // 0 (same) → 1 (opposite)
  })();

  const pitchScale = 200;  // Hz range
  const energyScale = 0.5;
  const zcrScale   = 0.5;
  const centroidScale = 4000; // Hz

  const distances = {
    mfcc:              mfccDist,
    pitch_mean:        scalarDist(stored.pitch_mean, live.pitch_mean, pitchScale),
    pitch_std:         scalarDist(stored.pitch_std,  live.pitch_std,  pitchScale),
    energy_mean:       scalarDist(stored.energy_mean, live.energy_mean, energyScale),
    zcr:               scalarDist(stored.zcr,         live.zcr,         zcrScale),
    spectral_centroid: scalarDist(stored.spectral_centroid, live.spectral_centroid, centroidScale),
  };

  const weightedDistance = Object.keys(WEIGHTS).reduce(
    (sum, k) => sum + WEIGHTS[k] * (distances[k] ?? 1),
    0
  );

  // Convert distance 0→1 to similarity 0→100
  const similarity = Math.round((1 - weightedDistance) * 100);

  return { similarity, passed: similarity >= THRESHOLD };
}

// ─── Feature extractors ──────────────────────────────────────────────────────

/** Zero Crossing Rate — how often signal crosses zero */
function computeZCR(data) {
  let crossings = 0;
  for (let i = 1; i < data.length; i++) {
    if ((data[i] >= 0) !== (data[i - 1] >= 0)) crossings++;
  }
  return crossings / data.length;
}

/** RMS Energy — loudness indicator */
function computeEnergy(data) {
  const sumSq = data.reduce((s, v) => s + v * v, 0);
  return Math.sqrt(sumSq / data.length);
}

/**
 * Pitch (F0) via autocorrelation.
 * Returns mean and std deviation of pitch across frames.
 */
function computePitch(data, sampleRate) {
  const frameSize   = 2048;
  const hopSize     = 512;
  const minHz       = 80;
  const maxHz       = 400;
  const minPeriod   = Math.floor(sampleRate / maxHz);
  const maxPeriod   = Math.floor(sampleRate / minHz);
  const pitches     = [];

  for (let start = 0; start + frameSize <= data.length; start += hopSize) {
    const frame      = data.slice(start, start + frameSize);
    let bestPeriod   = -1;
    let bestCorr     = -Infinity;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let corr = 0;
      for (let i = 0; i < frameSize - period; i++) {
        corr += frame[i] * frame[i + period];
      }
      if (corr > bestCorr) { bestCorr = corr; bestPeriod = period; }
    }

    if (bestPeriod > 0 && bestCorr > 0) {
      pitches.push(sampleRate / bestPeriod);
    }
  }

  if (pitches.length === 0) return { mean: 0, std: 0 };
  const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  const std  = Math.sqrt(pitches.reduce((s, p) => s + (p - mean) ** 2, 0) / pitches.length);
  return { mean, std };
}

/** Spectral Centroid — "brightness" of voice */
function computeSpectralCentroid(data, sampleRate) {
  const fftSize   = 2048;
  const slice     = data.slice(0, fftSize);
  // Apply Hann window
  const windowed  = slice.map((v, i) => v * 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize)));
  const spectrum  = computeFFTMagnitudes(windowed);

  let weightedSum = 0;
  let totalMag    = 0;
  const binHz     = sampleRate / fftSize;

  for (let i = 0; i < spectrum.length; i++) {
    weightedSum += spectrum[i] * i * binHz;
    totalMag    += spectrum[i];
  }
  return totalMag === 0 ? 0 : weightedSum / totalMag;
}

/**
 * MFCC — Mel Frequency Cepstral Coefficients.
 * 26 mel filterbanks → 13 coefficients via DCT.
 */
function computeMFCC(data, sampleRate) {
  const fftSize    = 2048;
  const numFilters = 26;
  const numCoeffs  = 13;
  const slice      = data.slice(0, fftSize);

  // Hann window
  const windowed   = slice.map((v, i) => v * 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize)));
  const spectrum   = computeFFTMagnitudes(windowed);
  const powerSpec  = spectrum.map((v) => v * v);

  // Mel filterbank
  const lowMel  = hzToMel(0);
  const highMel = hzToMel(sampleRate / 2);
  const melPts  = Array.from({ length: numFilters + 2 }, (_, i) =>
    melToHz(lowMel + (i * (highMel - lowMel)) / (numFilters + 1))
  );
  const binPts  = melPts.map((hz) => Math.floor((fftSize + 1) * hz / sampleRate));

  const filterEnergies = Array.from({ length: numFilters }, (_, m) => {
    let energy = 0;
    for (let k = binPts[m]; k < binPts[m + 2]; k++) {
      if (k >= powerSpec.length) break;
      const weight =
        k < binPts[m + 1]
          ? (k - binPts[m])   / Math.max(binPts[m + 1] - binPts[m], 1)
          : (binPts[m + 2] - k) / Math.max(binPts[m + 2] - binPts[m + 1], 1);
      energy += weight * powerSpec[k];
    }
    return Math.log(energy + 1e-10);
  });

  // DCT-II to get MFCC
  const mfcc = Array.from({ length: numCoeffs }, (_, n) =>
    filterEnergies.reduce(
      (sum, e, m) => sum + e * Math.cos((Math.PI / numFilters) * (m + 0.5) * n),
      0
    )
  );

  return mfcc;
}

// ─── Math helpers ────────────────────────────────────────────────────────────

function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
function melToHz(mel) { return 700 * (Math.pow(10, mel / 2595) - 1); }

/**
 * Real-valued DFT magnitude spectrum (first N/2+1 bins).
 * Pure JS — no Web Audio AnalyserNode needed.
 */
function computeFFTMagnitudes(samples) {
  const N   = samples.length;
  const out = new Float32Array(Math.floor(N / 2) + 1);

  for (let k = 0; k < out.length; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += samples[n] * Math.cos(angle);
      im -= samples[n] * Math.sin(angle);
    }
    out[k] = Math.sqrt(re * re + im * im) / N;
  }
  return out;
}
