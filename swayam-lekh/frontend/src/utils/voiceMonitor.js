/**
 * voiceMonitor.js
 * Continuous voice biometric monitoring during the 3-hour exam.
 * Every 30 seconds:  records 3s mic sample → extracts features
 *                    → compares against all stored profiles
 *                    → if avg similarity < 65 → calls onMismatch()
 */

import { extractFeatures, compareFeatures } from './audioFingerprint';
import { getVoiceProfiles, logMalpractice }  from '../services/supabaseClient';

const VERBOSE_VOICE_MONITOR = false;

const WINDOW_MS          = 1000;  // 1-second audio window
const MIN_VOICE_ENERGY   = 0.015; // Increased Voice Activity Detection (VAD) threshold
const CONFIDENCE_THRESH  = 85.0;  // 85% confidence required to trigger alarm
const RECAL_INTERVAL_MS  = 15 * 60 * 1000; // 15 minutes

let running          = false;
let micStream        = null;
let _ownsStream      = false; // true only if voiceMonitor opened the stream itself
let _registerNo      = '';
let _name            = '';
let _onMismatch      = null;

// ─── Public API ───────────────────────────────────────────────────────────────


/**
 * Start continuous voice monitoring.
 * @param {string}   registerNo
 * @param {string}   studentName
 * @param {function} onMismatch  - called with (similarityScore) when mismatch detected
 */
/**
 * Hand the already-open mic stream from ExamPage to the monitor so it can
 * reuse it instead of opening a competing second stream.
 * Call this BEFORE startVoiceMonitoring, or right after the exam mic opens.
 */
export function setMonitorStream(stream) {
  micStream   = stream;
  _ownsStream = false;
}

export async function startVoiceMonitoring(registerNo, studentName, onMismatch) {
  if (running) return; // already running

  _registerNo = registerNo;
  _name       = studentName;
  _onMismatch = onMismatch;
  running     = true;

  if (VERBOSE_VOICE_MONITOR) console.log('[VoiceMonitor] Starting — live continuous monitoring');

  // Only open our own stream if ExamPage hasn't handed one over
  if (!micStream) {
    try {
      micStream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      _ownsStream = true;
    } catch (err) {
      console.error('[VoiceMonitor] Mic permission denied:', err);
      running = false;
      return;
    }
  }

  // Start live monitoring loop
  liveMonitorLoop();
}


/**
 * Stop monitoring and release mic.
 */
export function stopVoiceMonitoring() {
  running = false;
  // Only stop tracks if WE opened the stream; ExamPage owns it otherwise
  if (micStream && _ownsStream) {
    micStream.getTracks().forEach(t => t.stop());
  }
  micStream   = null;
  _ownsStream = false;
  if (VERBOSE_VOICE_MONITOR) console.log('[VoiceMonitor] Stopped.');
}

// ─── Internal ─────────────────────────────────────────────────────────────────

// ─── Adaptive Tolerance Engine ────────────────────────────────────────────────
let currentBaseline = null;
let lastRecalibration = Date.now();

function updateBaseline(liveFeatures) {
  if (!currentBaseline) return;
  // Rolling weighted average (60% new, 40% original/current)
  currentBaseline.mfcc = currentBaseline.mfcc.map((v, i) => (v * 0.4) + (liveFeatures.mfcc[i] * 0.6));
  currentBaseline.pitch_mean = (currentBaseline.pitch_mean * 0.4) + (liveFeatures.pitch_mean * 0.6);
  currentBaseline.pitch_std  = (currentBaseline.pitch_std * 0.4)  + (liveFeatures.pitch_std * 0.6);
  currentBaseline.energy_mean = (currentBaseline.energy_mean * 0.4) + (liveFeatures.energy_mean * 0.6);
  currentBaseline.spectral_centroid = (currentBaseline.spectral_centroid * 0.4) + (liveFeatures.spectral_centroid * 0.6);
  currentBaseline.zcr = (currentBaseline.zcr * 0.4) + (liveFeatures.zcr * 0.6);
}

// ─── Continuous 1-Second Monitoring Loop ──────────────────────────────────────
async function liveMonitorLoop() {
  const profiles = await getVoiceProfiles(_registerNo);
  if (!profiles || profiles.length === 0) {
    console.warn('[VoiceMonitor] No stored profiles found — cannot monitor');
    running = false;
    return;
  }

  // Initialize baseline from the first captured registration profile
  const baseProfile = profiles[0];
  currentBaseline = {
    mfcc:              baseProfile.mfcc_features || Array(13).fill(0),
    pitch_mean:        baseProfile.pitch_mean || 150,
    pitch_std:         baseProfile.pitch_std || 20,
    energy_mean:       baseProfile.energy_mean || 0.05,
    zcr:               baseProfile.zero_crossing_rate || 0.1,
    spectral_centroid: baseProfile.spectral_centroid || 1500,
  };

  while (running) {
    try {
      const windowStart = Date.now();
      const blob = await recordSample(micStream, WINDOW_MS);
      const liveFeatures = await extractFeatures(blob);

      // 1. Voice Activity Detection (VAD)
      // Requires at least a minimum base energy, or 20% of the normal speaking volume
      const dynamicEnergyThreshold = Math.max(MIN_VOICE_ENERGY, currentBaseline.energy_mean * 0.2);
      if (liveFeatures.energy_mean < dynamicEnergyThreshold) {
        if (VERBOSE_VOICE_MONITOR) console.log('[VoiceMonitor] SILENCE detected. Continuing...');
        continue;
      }
      
      // Simple heuristic for non-human noise vs human speech (using ZCR/Pitch)
      // Human pitch is typically 60-500Hz. Background hums or clatter fall outside or have high ZCR.
      if (liveFeatures.pitch_mean < 60 || liveFeatures.pitch_mean > 500 || liveFeatures.zcr > 0.35) {
        if (VERBOSE_VOICE_MONITOR) console.log(`[VoiceMonitor] NOISE detected (Pitch: ${liveFeatures.pitch_mean.toFixed(1)}, ZCR: ${liveFeatures.zcr.toFixed(3)}). Continuing...`);
        continue;
      }

      // 2. Run 7 Parameter Checks
      let passedParams = 0;
      const failedList = [];

      // Check 1: Fundamental Frequency (pitch) ±15%
      const pitchDiff = Math.abs(liveFeatures.pitch_mean - currentBaseline.pitch_mean) / currentBaseline.pitch_mean;
      if (pitchDiff <= 0.15) passedParams++; else failedList.push('Fundamental Frequency (F0)');

      // Check 2: Amplitude/Volume
      const energyDiff = Math.abs(liveFeatures.energy_mean - currentBaseline.energy_mean) / currentBaseline.energy_mean;
      if (energyDiff <= 0.30) passedParams++; else failedList.push('Amplitude/Volume'); // a bit more lenient on volume room acoustics

      // Check 3: MFCCs (using cosine distance from compareFeatures logic)
      const { similarity: mfccSim } = compareFeatures(currentBaseline, liveFeatures); // We reuse the comparison utility for overall match
      if (mfccSim >= 70) passedParams++; else failedList.push('MFCCs / Voice Print');

      // Check 4: Formant Frequencies (using spectral centroid as a proxy for formants in our pure JS implementation)
      const centroidDiff = Math.abs(liveFeatures.spectral_centroid - currentBaseline.spectral_centroid) / currentBaseline.spectral_centroid;
      if (centroidDiff <= 0.20) passedParams++; else failedList.push('Formant Frequencies');

      // Check 5: Speech Rhythm/Cadence (using pitch standard deviation as variation proxy)
      const rhythmDiff = Math.abs(liveFeatures.pitch_std - currentBaseline.pitch_std);
      if (rhythmDiff <= 40) passedParams++; else failedList.push('Speech Rhythm/Cadence');

      // Check 6: Spectral Centroid (Brightness)
      if (centroidDiff <= 0.25) passedParams++; else failedList.push('Spectral Brightness');

      // Check 7: VAD (already passed to get here)
      passedParams++; 

      // 3. Decision Engine
      const confidence = Math.round((passedParams / 7) * 100);
      
      if (confidence >= CONFIDENCE_THRESH) {
        // ✅ CANDIDATE CONFIRMED
        // Check if we need to recalibrate baseline (every 15 mins)
        if (Date.now() - lastRecalibration > RECAL_INTERVAL_MS) {
          if (VERBOSE_VOICE_MONITOR) console.log('[VoiceMonitor] Recalibrating baseline...');
          updateBaseline(liveFeatures);
          lastRecalibration = Date.now();
        }
      } 
      else if (passedParams >= 4 && passedParams <= 5) {
        // ⚠️ AMBIGUOUS
        console.warn(`[VoiceMonitor] ⚠️ AMBIGUOUS MATCH (${confidence}%). Watching closely...`);
      }
      else {
        // 🚨 FOREIGN VOICE DETECTED (0-3 matches)
        console.error(`[VoiceMonitor] 🚨 INTRUSION DETECTED. Confidence: ${confidence}%`);
        console.error(`[VoiceMonitor] Failed params: ${failedList.join(', ')}`);
        
        // Trigger Malpractice Protocol immediately
        await logMalpractice(_registerNo, _name, confidence, failedList.join(', '));
        // [TEMPORARY DISABLE] if (_onMismatch) _onMismatch(confidence, failedList);
        console.warn('[MOCK] Malpractice flagging disabled in UI');
        
        // Note: We DO NOT stop running. We continue monitoring.
      }

      // Exact 1-second alignment logic. 
      // recordSample took ~1000ms, extractFeatures took X ms.
      const elapsed = Date.now() - windowStart;
      if (elapsed < WINDOW_MS) {
        await new Promise(res => setTimeout(res, WINDOW_MS - elapsed));
      }

    } catch (err) {
      console.error('[VoiceMonitor] Loop error:', err);
      await new Promise(res => setTimeout(res, 1000)); // wait and retry
    }
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
