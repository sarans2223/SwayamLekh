/**
 * voiceMonitor.js
 * Continuous voice biometric monitoring during the 3-hour exam.
 * Every 30 seconds:  records 3s mic sample → extracts features
 *                    → compares against all stored profiles
 *                    → if avg similarity < 65 → calls onMismatch()
 */

import { extractFeatures, compareFeatures } from './audioFingerprint';
import { getVoiceProfiles, logMalpractice }  from '../services/supabaseClient';

const CHECK_INTERVAL_MS  = 30_000;   // every 30 seconds
const SAMPLE_DURATION_MS = 3_000;    // 3-second sample
const SIMILARITY_THRESHOLD = 65;

let intervalId  = null;
let micStream   = null;
let _registerNo = '';
let _name       = '';
let _onMismatch = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start continuous voice monitoring.
 * @param {string}   registerNo
 * @param {string}   studentName
 * @param {function} onMismatch  - called with (similarityScore) when mismatch detected
 */
export async function startVoiceMonitoring(registerNo, studentName, onMismatch) {
  if (intervalId) return; // already running

  _registerNo = registerNo;
  _name       = studentName;
  _onMismatch = onMismatch;

  console.log('[VoiceMonitor] Starting — checks every 30s');

  // Acquire mic once and keep it open
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error('[VoiceMonitor] Mic permission denied:', err);
    return;
  }

  // First check after 30s, then every 30s
  intervalId = setInterval(runCheck, CHECK_INTERVAL_MS);
}

/**
 * Stop monitoring and release mic.
 */
export function stopVoiceMonitoring() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (micStream)  { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  console.log('[VoiceMonitor] Stopped.');
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function runCheck() {
  console.log('[VoiceMonitor] Running check…');

  try {
    // 1. Record 3-second sample
    const blob = await recordSample(micStream, SAMPLE_DURATION_MS);

    // 2. Extract features from live sample
    const liveFeatures = await extractFeatures(blob);

    // 3. Fetch stored profiles from Supabase
    const profiles = await getVoiceProfiles(_registerNo);
    if (!profiles || profiles.length === 0) {
      console.warn('[VoiceMonitor] No stored profiles found — skipping check');
      return;
    }

    // 4. Compare live against each stored profile, take the best match
    let bestSimilarity = 0;
    for (const profile of profiles) {
      const stored = {
        mfcc:              profile.mfcc_features,
        pitch_mean:        profile.pitch_mean,
        pitch_std:         profile.pitch_std,
        energy_mean:       profile.energy_mean,
        zcr:               profile.zero_crossing_rate,
        spectral_centroid: profile.spectral_centroid,
      };
      const { similarity } = compareFeatures(stored, liveFeatures);
      if (similarity > bestSimilarity) bestSimilarity = similarity;
    }

    console.log(`[VoiceMonitor] Best similarity: ${bestSimilarity}% (threshold: ${SIMILARITY_THRESHOLD}%)`);

    // 5. Mismatch → alarm
    if (bestSimilarity < SIMILARITY_THRESHOLD) {
      console.warn(`[VoiceMonitor] ⚠️ MISMATCH — similarity ${bestSimilarity}%`);
      await logMalpractice(_registerNo, _name, bestSimilarity);
      if (_onMismatch) _onMismatch(bestSimilarity);
    }
  } catch (err) {
    console.error('[VoiceMonitor] Check error:', err);
  }
}

/** Record mic for exactly `ms` milliseconds, return Blob */
function recordSample(stream, ms) {
  return new Promise((resolve, reject) => {
    if (!stream) { reject(new Error('No mic stream')); return; }
    const recorder = new MediaRecorder(stream);
    const chunks   = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop          = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
    recorder.onerror         = reject;
    recorder.start();
    setTimeout(() => recorder.stop(), ms);
  });
}
