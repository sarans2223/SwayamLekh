// Strict gesture classifier for MediaPipe hand landmarks
// Landmarks: array of 21 points {x,y,z}
// frameHistory: array of last N frames, each { landmarks, handednessScore, timestamp }

function variance(values) {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }



// Toggle verbose logging for gesture engine (set to true to enable)
const GESTURE_ENGINE_VERBOSE = false;
const glog = (...args) => { if (GESTURE_ENGINE_VERBOSE) console.log(...args); };

export function classifyGesture(landmarks, frameHistory = []) {
  try {
    if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 21) {
      glog('[GestureEngine] Rejected: invalid-landmarks');
      return { gesture: null, confidence: 0, reason: 'invalid-landmarks' };
    }

    // Build simple confidence estimate from frameHistory handedness scores
    const scores = frameHistory.map((f) => (typeof f.handednessScore === 'number' ? f.handednessScore : 1)).slice(-5);
    const confidence = scores.length ? avg(scores) : 1;
    if (confidence < 0.85) {
      glog('[GestureEngine] Rejected: low-confidence', confidence);
      return { gesture: null, confidence, reason: 'low-confidence' };
    }

    // Anti-trigger: require at least 10 frames of history before considering gestures
    // Quick pre-check: allow an immediate THUMB_DOWN detection when the thumb
    // angle points roughly down and all fingers are curled. This lets users
    // trigger 'repeat question' faster without waiting for full history.
    try {
      const thumbTipQ = landmarks[4];
      const wristQ = landmarks[0];
      const indexTipQ = landmarks[8];
      const indexPIPQ = landmarks[6];
      const midTipQ = landmarks[12];
      const midPIPQ = landmarks[10];
      const ringTipQ = landmarks[16];
      const ringPIPQ = landmarks[14];
      const pinkyTipQ = landmarks[20];
      const pinkyPIPQ = landmarks[18];
      if (thumbTipQ && wristQ && indexTipQ && indexPIPQ && midTipQ && midPIPQ && ringTipQ && ringPIPQ && pinkyTipQ && pinkyPIPQ) {
        const angle = Math.atan2(wristQ.y - thumbTipQ.y, thumbTipQ.x - wristQ.x) * (180 / Math.PI);
        const norm = ((angle % 360) + 360) % 360; // normalize 0-360
        const idxCurledQ = indexTipQ.y > indexPIPQ.y + 0.03;
        const midCurledQ = midTipQ.y > midPIPQ.y + 0.03;
        const ringCurledQ = ringTipQ.y > ringPIPQ.y + 0.03;
        const pinkyCurledQ = pinkyTipQ.y > pinkyPIPQ.y + 0.03;
        if (norm >= 160 && norm <= 200 && idxCurledQ && midCurledQ && ringCurledQ && pinkyCurledQ) {
          glog('[GestureEngine] QUICK DETECT: THUMB_DOWN');
          return { gesture: 'THUMB_DOWN', confidence, reason: 'quick-detect' };
        }
      }
    } catch (e) { /* ignore quick-detect errors */ }

    const framesSeen = frameHistory.length;
    if (framesSeen < 10) {
      glog('[GestureEngine] Rejected: hand-too-new', framesSeen);
      return { gesture: null, confidence, reason: 'hand-too-new', framesSeen };
    }

    // Wrist stability checks (use last up to 5 frames)
    const recent = frameHistory.slice(-5);
    const wristXs = recent.map((f) => f.landmarks?.[0]?.x ?? 0);
    const wristYs = recent.map((f) => f.landmarks?.[0]?.y ?? 0);
    const varX = variance(wristXs);
    const varY = variance(wristYs);
    if ((varX + varY) >= 0.02) {
      glog('[GestureEngine] Rejected: unstable-wrist', { varX, varY });
      return { gesture: null, confidence, reason: 'unstable-wrist' };
    }

    // Fast motion: check consecutive deltas > 0.05
    for (let i = recent.length - 1; i > 0; i--) {
      const a = recent[i].landmarks?.[0];
      const b = recent[i - 1].landmarks?.[0];
      if (!a || !b) continue;
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx > 0.05 || dy > 0.05) {
        glog('[GestureEngine] Rejected: fast-motion', { dx, dy });
        return { gesture: null, confidence, reason: 'fast-motion' };
      }
    }

    // Helper indices
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexMCP = landmarks[5];
    const indexPIP = landmarks[6];
    const middleMCP = landmarks[9];
    const middlePIP = landmarks[10];
    const ringMCP = landmarks[13];
    const ringPIP = landmarks[14];
    const pinkyMCP = landmarks[17];
    const pinkyPIP = landmarks[18];

    const isFingerExtendedStrict = (tip, pip, threshold = 0.03) => {
      if (typeof tip?.y !== 'number' || typeof pip?.y !== 'number') return false;
      return tip.y < (pip.y - threshold);
    };

    const isFingerCurled = (tip, pip, threshold = 0.03) => {
      if (typeof tip?.y !== 'number' || typeof pip?.y !== 'number') return false;
      return tip.y > (pip.y + threshold);
    };

    // Tunable thresholds
    const THUMB_X_THRESHOLD = 0.10; // lowered from 0.15 to be less strict
    const THUMB_ALMOST_THRESHOLD = 0.08; // log near-miss when between almost and threshold
    // If the hand's palm center (wrist + MCPs) is above this normalized Y value
    // we treat the hand as 'near-face' and ignore gesture triggers to avoid
    // accidental detections when the student touches their face. Lowering
    // this value makes the guard less aggressive so raised hands still work.
    // Normalized to the video coordinate system (0 = top, 1 = bottom).
    const NEAR_FACE_Y_THRESHOLD = 0.20;

    // Thumb checks relative to index MCP
    const thumbRightCond = (typeof thumbTip?.x === 'number' && typeof indexMCP?.x === 'number')
      ? (thumbTip.x > indexMCP.x + THUMB_X_THRESHOLD)
      : false;
    const thumbLeftCond = (typeof thumbTip?.x === 'number' && typeof indexMCP?.x === 'number')
      ? (thumbTip.x < indexMCP.x - THUMB_X_THRESHOLD)
      : false;

    // Thumb up check
    const thumbUpCond = (typeof thumbTip?.y === 'number' && typeof wrist?.y === 'number')
      ? (thumbTip.y < wrist.y - 0.2)
      : false;

    // Minimal face-guard: compute palm center Y and ignore gestures if hand
    // appears near the top of the frame (likely touching face). This keeps
    // the change minimal while reducing accidental triggers.
    try {
      const palmYs = [wrist?.y, indexMCP?.y, middleMCP?.y, ringMCP?.y, pinkyMCP?.y].filter((v) => typeof v === 'number');
      if (palmYs.length === 5) {
        const palmCenterY = avg(palmYs);
        if (palmCenterY < NEAR_FACE_Y_THRESHOLD) {
          glog('[GestureEngine] Ignored: hand near face (palmCenterY=' + palmCenterY.toFixed(3) + ')');
          return { gesture: null, confidence, reason: 'hand-near-face' };
        }
      }
    } catch (e) { /* non-fatal: continue without guard */ }

    // Thumb angle detection (detect straight down ~180deg)
    try {
      const angle = Math.atan2(wrist.y - thumbTip.y, thumbTip.x - wrist.x) * (180 / Math.PI);
      const norm = ((angle % 360) + 360) % 360; // normalize 0-360
      if (norm >= 160 && norm <= 200) {
        glog('[GestureEngine] gesture detected: THUMB_DOWN');
        return { gesture: 'THUMB_DOWN', confidence };
      }
    } catch (e) {
      // ignore angle calc errors
    }

    // Open palm: all five fingers extended and spread. Make thresholds more
    // permissive so normal open-palms are detected reliably across poses.
    const idxExt = isFingerExtendedStrict(indexTip, indexMCP, 0.02);
    const midExt = isFingerExtendedStrict(middleTip, middleMCP, 0.02);
    const ringExt = isFingerExtendedStrict(ringTip, ringMCP, 0.02);
    const pinkyExt = isFingerExtendedStrict(pinkyTip, pinkyMCP, 0.02);
    // Prefer horizontal thumb spread instead of strict vertical position so
    // rotated hands still count as open palm.
    const thumbExtForOpen = (typeof thumbTip?.x === 'number' && typeof indexMCP?.x === 'number')
      ? Math.abs(thumbTip.x - indexMCP.x) > 0.02
      : false;

    const indexPinkyDist = Math.abs(indexTip.x - pinkyTip.x);

    // Finger count with strict threshold
    const idxStrict = isFingerExtendedStrict(indexTip, indexPIP, 0.03);
    const midStrict = isFingerExtendedStrict(middleTip, middlePIP, 0.03);
    const ringStrict = isFingerExtendedStrict(ringTip, ringPIP, 0.03);
    const pinkyStrict = isFingerExtendedStrict(pinkyTip, pinkyPIP, 0.03);
    const thumbTucked = (typeof thumbTip?.x === 'number' && typeof indexMCP?.x === 'number')
      ? Math.abs(thumbTip.x - indexMCP.x) <= 0.1
      : false;

    // Determine which gesture conditions are met in this frame
    const frameFlags = {
      THUMB_RIGHT: thumbRightCond && isFingerCurled(indexTip, indexPIP) && isFingerCurled(middleTip, middlePIP) && isFingerCurled(ringTip, ringPIP) && isFingerCurled(pinkyTip, pinkyPIP),
      THUMB_LEFT: thumbLeftCond && isFingerCurled(indexTip, indexPIP) && isFingerCurled(middleTip, middlePIP) && isFingerCurled(ringTip, ringPIP) && isFingerCurled(pinkyTip, pinkyPIP),
      THUMB_UP: thumbUpCond && isFingerCurled(indexTip, indexPIP) && isFingerCurled(middleTip, middlePIP) && isFingerCurled(ringTip, ringPIP) && isFingerCurled(pinkyTip, pinkyPIP),
      THUMB_DOWN: (typeof thumbTip?.y === 'number' && typeof wrist?.y === 'number') ? (thumbTip.y > wrist.y + 0.2) && isFingerCurled(indexTip, indexPIP) && isFingerCurled(middleTip, middlePIP) && isFingerCurled(ringTip, ringPIP) && isFingerCurled(pinkyTip, pinkyPIP) : false,
      OPEN_PALM: idxExt && midExt && ringExt && pinkyExt && thumbExtForOpen && (indexPinkyDist > 0.25),
      ONE_FINGER: idxStrict && !midStrict && !ringStrict && !pinkyStrict && thumbTucked,
      TWO_FINGERS: idxStrict && midStrict && !ringStrict && !pinkyStrict && thumbTucked,
      THREE_FINGERS: idxStrict && midStrict && ringStrict && !pinkyStrict && thumbTucked,
      FOUR_FINGERS: idxStrict && midStrict && ringStrict && pinkyStrict && thumbTucked,
    };

    // Confirm across last N frames: the same flag must be true in last N frames
    const checkConsecutive = (flag) => {
      let count = 0;
      for (let i = frameHistory.length - 1; i >= 0 && count < 5; i--) {
        const fh = frameHistory[i];
        if (!fh || !fh.landmarks) break;
        // Recompute frame-level flag for fh.landmarks
        const l = fh.landmarks;
        const fIdxPIP = l[6]; const fMidPIP = l[10]; const fRingPIP = l[14]; const fPinkyPIP = l[18];
        const fIdxTip = l[8]; const fMidTip = l[12]; const fRingTip = l[16]; const fPinkyTip = l[20];
        const fIndexMCP = l[5];
        const fThumbTip = l[4]; const fWrist = l[0];
        const fThumbRight = (fThumbTip.x > fIndexMCP.x + 0.15) && (fIdxTip.y > fIdxPIP.y + 0.03) && (fMidTip.y > fMidPIP.y + 0.03) && (fRingTip.y > fRingPIP.y + 0.03) && (fPinkyTip.y > fPinkyPIP.y + 0.03);
        const fThumbLeft = (fThumbTip.x < fIndexMCP.x - 0.15) && (fIdxTip.y > fIdxPIP.y + 0.03) && (fMidTip.y > fMidPIP.y + 0.03) && (fRingTip.y > fRingPIP.y + 0.03) && (fPinkyTip.y > fPinkyPIP.y + 0.03);
        const fThumbUp = (fThumbTip.y < fWrist.y - 0.2) && (fIdxTip.y > fIdxPIP.y + 0.03) && (fMidTip.y > fMidPIP.y + 0.03) && (fRingTip.y > fRingPIP.y + 0.03) && (fPinkyTip.y > fPinkyPIP.y + 0.03);
        const fThumbIP = l[3];
        const fIdxDip = l[7]; const fMidDip = l[11]; const fRingDip = l[15]; const fPinkyDip = l[19];
        
        const fIdxExt = fIdxTip.y < fIdxPIP.y - 0.015; const fMidExt = fMidTip.y < fMidPIP.y - 0.015; const fRingExt = fRingTip.y < fRingPIP.y - 0.015; const fPinkyExt = fPinkyTip.y < fPinkyPIP.y - 0.015;
        const fThumbTucked = Math.abs(fThumbTip.x - fIndexMCP.x) <= 0.1;
        let matches = false;
        switch (flag) {
          case 'THUMB_RIGHT': matches = fThumbRight; break;
          case 'THUMB_LEFT': matches = fThumbLeft; break;
          case 'THUMB_UP': matches = fThumbUp; break;
          
          case 'OPEN_PALM': matches = (fIdxExt && fMidExt && fRingExt && fPinkyExt && Math.abs(fIndexMCP.x - fPinkyTip.x) > 0.18); break;
          case 'ONE_FINGER': matches = (fIdxExt && !fMidExt && !fRingExt && !fPinkyExt && fThumbTucked); break;
          case 'TWO_FINGERS': matches = (fIdxExt && fMidExt && !fRingExt && !fPinkyExt && fThumbTucked); break;
          case 'THREE_FINGERS': matches = (fIdxExt && fMidExt && fRingExt && !fPinkyExt && fThumbTucked); break;
          case 'FOUR_FINGERS': matches = (fIdxExt && fMidExt && fRingExt && fPinkyExt && fThumbTucked); break;
          default: matches = false;
        }
        if (matches) count++; else break;
      }
      return count;
    };

    // Evaluate candidate flags in priority order
    // NOTE: OPEN_PALM is intentionally prioritized before THUMB_DOWN
    // so an open hand reliably clears answers instead of being misclassified as a thumb gesture.
    const candidates = ['THUMB_RIGHT','THUMB_LEFT','THUMB_UP','OPEN_PALM','THUMB_DOWN','FOUR_FINGERS','THREE_FINGERS','TWO_FINGERS','ONE_FINGER'];
    for (const cand of candidates) {
      const confirmed = checkConsecutive(cand);
      // Require fewer consecutive frames for quick THUMB_DOWN detection (3 instead of 5)
      const required = (cand === 'THUMB_DOWN' || cand === 'OPEN_PALM') ? 2 : 5;
      if (confirmed >= required) {
        // Anti-contradiction: THUMB_RIGHT must never fire when any finger extended
        if (cand === 'THUMB_RIGHT') {
          if (idxStrict || midStrict || ringStrict || pinkyStrict) {
            glog('[GestureEngine] Rejected: thumb-right-but-finger-extended');
            return { gesture: null, confidence, reason: 'thumb-right-but-finger-extended' };
          }
        }
        glog(`[GestureEngine] CONFIRMED after ${confirmed}/${required} frames: ${cand}`, { confidence });
        return { gesture: cand, confidence, frames: confirmed };
      }
    }

    // If near-miss for THUMB_RIGHT, log details to help tuning
    try {
      if (typeof thumbTip?.x === 'number' && typeof indexMCP?.x === 'number') {
        const dx = thumbTip.x - indexMCP.x;
        if (dx > THUMB_ALMOST_THRESHOLD && dx <= THUMB_X_THRESHOLD) {
          glog('[GestureEngine] Almost THUMB_RIGHT — dx=', dx.toFixed(3), 'thumbTip.x=', thumbTip.x.toFixed(3), 'indexMCP.x=', indexMCP.x.toFixed(3), 'confidence=', confidence);
        }
      }
    } catch (e) { /* ignore */ }

    glog('[GestureEngine] Rejected: no-gesture-confirmed', { confidence });
    return { gesture: null, confidence, reason: 'no-gesture-confirmed' };
  } catch (err) {
    console.error('[GestureEngine] error classifying gesture:', err);
    return { gesture: null, confidence: 0, reason: 'error' };
  }
}
