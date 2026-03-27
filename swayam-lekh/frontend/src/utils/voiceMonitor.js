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

let running     = false;
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
  if (running) return; // already running

  _registerNo = registerNo;
  _name       = studentName;
  _onMismatch = onMismatch;
  running     = true;

  console.log('[VoiceMonitor] Starting — live continuous monitoring');

  // Acquire mic once and keep it open
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error('[VoiceMonitor] Mic permission denied:', err);
    running = false;
    return;
  }

  // Start live monitoring loop
  liveMonitorLoop();
}


/**
 * Stop monitoring and release mic.
 */
export function stopVoiceMonitoring() {
  running = false;
  if (micStream)  { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  console.log('[VoiceMonitor] Stopped.');
}

// ─── Internal ─────────────────────────────────────────────────────────────────

// Live monitoring loop: records short overlapping windows, checks instantly
async function liveMonitorLoop() {
  const WINDOW_MS = 1000;   // 1 second window
  const HOP_MS    = 500;    // slide every 0.5s (overlap)
  let profiles    = await getVoiceProfiles(_registerNo);
  if (!profiles || profiles.length === 0) {
    console.warn('[VoiceMonitor] No stored profiles found — cannot monitor');
    running = false;
    return;
  }
  while (running) {
    try {
      const blob = await recordSample(micStream, WINDOW_MS);
      const liveFeatures = await extractFeatures(blob);
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
      console.log(`[VoiceMonitor] Live similarity: ${bestSimilarity}%`);
      if (bestSimilarity < SIMILARITY_THRESHOLD) {
        console.warn(`[VoiceMonitor] ⚠️ LIVE MISMATCH — similarity ${bestSimilarity}%`);
        await logMalpractice(_registerNo, _name, bestSimilarity);
        if (_onMismatch) _onMismatch(bestSimilarity);
        running = false; // stop further checks until reset
        break;
      }
    } catch (err) {
      console.error('[VoiceMonitor] Live check error:', err);
    }
    // Wait for hop duration before next window
    await new Promise(res => setTimeout(res, HOP_MS));
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
