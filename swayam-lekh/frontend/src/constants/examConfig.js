// src/constants/examConfig.js

export const EXAM_CONFIG = {
  // Timer
  TOTAL_DURATION_MINUTES: 180,   // 3 hours
  WARNING_MINUTES: 30,            // yellow warning
  CRITICAL_MINUTES: 10,           // red warning

  // Registration
  REGISTER_NUMBER_LENGTH: 8,

  // Voice
  COUNTDOWN_SECONDS: 4,           // countdown before answer recording starts
  READBACK_DELAY_MS: 500,         // delay before reading back
  COMMAND_DEBOUNCE_MS: 300,       // prevent double command triggers

  // Voice sample — commands student must repeat during instructions
  VOICE_SAMPLE_COMMANDS: [
    'START',
    'STOP',
    'SUBMIT',
    'SKIP',
    'REPEAT',
    'READ BACK',
    'CLEAR',
    'FLAG',
    'HELP HELP HELP'
  ],

  // Webcam
  WEBCAM_PHOTO_WIDTH: 400,
  WEBCAM_PHOTO_HEIGHT: 300,

  // Security
  INVIGILATOR_CODE: '12345'
}

export const QUESTION_STATUS = {
  NOT_VISITED: 'not_visited',
  ANSWERED:    'answered',
  SKIPPED:     'skipped',
  FLAGGED:     'flagged',
  ACTIVE:      'active'
}

export const QUESTION_STATUS_LABELS = {
  not_visited: 'Not Visited',
  answered:    'Answered',
  skipped:     'Skipped',
  flagged:     'Flagged',
  active:      'Active'
}