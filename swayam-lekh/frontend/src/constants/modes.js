// src/constants/modes.js

export const DISABILITY_MODES = [
  { id: 'visual', title: 'Visually Impaired', desc: 'Voice input + audio readback enabled. Screen optimized for clarity.', icon: '👁️' },
  { id: 'bone', title: 'Bone / Motor Impaired', desc: 'Voice input enabled. Minimal physical interaction required.', icon: '🦴' },
  { id: 'deaf', title: 'Hearing Impaired', desc: 'Text-only mode. No audio output. Visual cues only.', icon: '🦻' },
];

export const DISABILITY_MODE_LABELS = {
  visual: 'Visually Impaired',
  bone:   'Bone / Motor Impaired',
  deaf:   'Hearing Impaired'
}

export const DISABILITY_MODE_DESCRIPTIONS = {
  visual: 'Voice input + audio readback enabled. Screen optimized for clarity.',
  bone:   'Voice input enabled. Minimal physical interaction required.',
  deaf:   'Text-only mode. No audio output. Visual cues only.'
}

export const SUBJECT_MODES = [
  { id: 'normal', title: 'General / Language', desc: 'Standard text answers.' },
  { id: 'maths', title: 'Mathematics', desc: 'Math notation conversion enabled. Speak equations naturally.' },
  { id: 'chemistry', title: 'Chemistry / Science', desc: 'Chemical formula conversion enabled. Speak formulas naturally.' },
];

// Backwards-compatible object maps (uppercase keys) for any code expecting the old object shape
export const DISABILITY_MODES_MAP = DISABILITY_MODES.reduce((acc, m) => {
  acc[m.id.toUpperCase()] = m.id;
  return acc;
}, {});

export const SUBJECT_MODES_MAP = SUBJECT_MODES.reduce((acc, m) => {
  acc[m.id.toUpperCase()] = m.id;
  return acc;
}, {});

// Also export legacy-named constants for convenience
export const DISABILITY = { ...DISABILITY_MODES_MAP };
export const SUBJECT = { ...SUBJECT_MODES_MAP };

export const SUBJECT_MODE_LABELS = {
  normal:    'General / Language',
  maths:     'Mathematics',
  chemistry: 'Chemistry / Science'
}

export const SUBJECT_MODE_DESCRIPTIONS = {
  normal:    'Standard text answers.',
  maths:     'Math notation conversion enabled. Speak equations naturally.',
  chemistry: 'Chemical formula conversion enabled. Speak formulas naturally.'
}