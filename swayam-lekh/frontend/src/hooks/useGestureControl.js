import { useEffect, useRef } from 'react';
import { classifyGesture } from '../utils/gestureEngine';
import { isTTSPlaying } from '../utils/audioState';

const VERBOSE_GESTURE_CONTROL = false;
 
export function useGestureControl({ videoRef, onGesture, enabled = true }) {
  const handsRef           = useRef(null);
  const rafRef             = useRef(null);
  const runningRef         = useRef(false);       // ← useRef, not let
  const lastImmediateFired = useRef(0);
  const holdStartRef       = useRef(null);
  const lastDetectedRef    = useRef(null);
  const frameHistoryRef    = useRef([]);
  const lastFiredTimes     = useRef({});
  const onGestureRef       = useRef(onGesture);   // ← stable ref so effect never re-runs
 
  // Keep onGestureRef up to date without triggering effect
  useEffect(() => { onGestureRef.current = onGesture; }, [onGesture]);
 
  useEffect(() => {
    if (!enabled) return;
 
    // Guard: don't init twice
    if (handsRef.current) {
      if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] Already initialized, skipping');
      return;
    }

    if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] Initializing MediaPipe Hands');
 
    try {
      if (typeof window !== 'undefined') {
        window.Module = window.Module || {};
        window.Module.arguments = window.Module.arguments || [];
      }
    } catch (e) { /* ignore */ }
 
    let stopped = false;
    let initialized = false;
    let hands = null;

    const initHands = () => {
      if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] initHands called');
      if (stopped) return;
      if (!window?.Hands) {
        // retry until the script loads
        if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] window.Hands not ready, retrying in 300ms');
        setTimeout(initHands, 300);
        return;
      }

      hands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
    });
 
      hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true,
    });
 
    hands.onResults((results) => {
      try {
        if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] onResults', { multiHandLandmarks: results?.multiHandLandmarks?.length, multiHandedness: results?.multiHandedness });
        // Allow gesture detection even while TTS is playing so gestures and voice can operate concurrently.
 
          const landmarks = results?.multiHandLandmarks?.[0];
          if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] landmarks present?', !!landmarks);
        if (!landmarks) {
          holdStartRef.current    = null;
          lastDetectedRef.current = null;
          return;
        }

        // record frame into history for classifier
        try {
          const handednessScore = results?.multiHandedness?.[0]?.score ?? 1;
          frameHistoryRef.current.push({ landmarks, handednessScore, timestamp: Date.now() });
          if (frameHistoryRef.current.length > 10) frameHistoryRef.current.shift();
        } catch (e) {
          console.warn('[GestureControl] frameHistory push failed', e);
        }

        const res = classifyGesture(landmarks, frameHistoryRef.current);
        if (!res || !res.gesture) {
          // log rejection reason forwarded by classifier
          if (res && res.reason && VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] classifier rejected frame:', res.reason);
          holdStartRef.current    = null;
          lastDetectedRef.current = null;
          return;
        }

        const gesture = res.gesture;
        const now = Date.now();

        // Anti-trigger: never fire same gesture twice within a short window
        // Use a shorter debounce for THUMB_DOWN so repeat-question triggers feel snappier
        const lastFired = lastFiredTimes.current[gesture] || 0;
        const debounceMs = (gesture === 'THUMB_DOWN') ? 1200 : 2000;
        if (now - lastFired < debounceMs) {
          if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] Ignoring due to debounce for gesture', gesture);
          return;
        }

        // gestures that require additional hold after confirmation
        // OPEN_PALM should fire immediately to make clearing answers responsive.
        const holdRequired = (gesture === 'THUMB_UP');
        if (holdRequired) {
          if (lastDetectedRef.current !== gesture) {
            holdStartRef.current = Date.now();
            lastDetectedRef.current = gesture;
            if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] Hold start for', gesture);
            return;
          }
          const elapsed = Date.now() - (holdStartRef.current || 0);
          if (elapsed < 1000) {
            // still holding
            return;
          }
          // hold confirmed
          if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] Hold confirmed for', gesture);
          try { onGestureRef.current?.(gesture); } catch (e) { console.error('[GestureControl] onGesture error:', e); }
          lastFiredTimes.current[gesture] = Date.now();
          holdStartRef.current = null;
          lastDetectedRef.current = null;
          return;
        }

        // Immediate fire gestures (already 5-frame confirmed by classifier)
        if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] Firing gesture:', gesture, 'confidence=', res.confidence);
        try { onGestureRef.current?.(gesture); } catch (e) { console.error('[GestureControl] onGesture error:', e); }
        lastFiredTimes.current[gesture] = Date.now();
        holdStartRef.current = null;
        lastDetectedRef.current = null;
 
      } catch (err) {
        console.error('[GestureControl] onResults error:', err);
      }
    });
 
      handsRef.current = hands;
      initialized = true;
      if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] MediaPipe Hands initialized');
    runningRef.current = true;
 
    // Frame loop
    const processFrame = async () => {
      if (!runningRef.current) return;
        try {
          const video = videoRef?.current;
          if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] processFrame videoReadyState=', video ? video.readyState : 'no-video', 'videoRef=', !!video);
        if (video && video.readyState >= 2 && handsRef.current) {
          if (video.paused) {
            try { await video.play(); if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] video.play() invoked'); } catch (e) { console.warn('[GestureControl] video.play() failed', e); }
          }
          await handsRef.current.send({ image: video });
          if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] frame sent to hands');
        }
      } catch (err) {
        console.error('[GestureControl] Frame error, stopping:', err);
        runningRef.current = false;
        return;
      }
      if (runningRef.current) {
        rafRef.current = requestAnimationFrame(processFrame);
      }
    };
 
    rafRef.current = requestAnimationFrame(processFrame);

    };

    // start initialization (will wait for window.Hands if not yet loaded)
    initHands();

    return () => {
      if (VERBOSE_GESTURE_CONTROL) console.log('[GestureControl] Cleanup');
      runningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (handsRef.current) {
        try { handsRef.current.close(); } catch (_) {}
        handsRef.current = null;
      }
    };
  }, [enabled, videoRef]); // ← onGesture removed from deps — handled via ref
}