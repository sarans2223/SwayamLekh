========================================================
  SWAYAM LEKH — AUDIO FILES GUIDE
  Place ALL audio files in THIS exact folder:

  c:\Users\saran\Desktop\SwayamLekh\swayam-lekh\frontend\public\audio\
========================================================

── INTRO AUDIO ─────────────────────────────────────────

  intro_en.mp3        →  English introduction audio
  intro_ta.mp3        →  Tamil introduction audio

── COMMAND AUDIO — ENGLISH ─────────────────────────────

  cmd_1_stop.mp3               →  "STOP STOP STOP"
  cmd_2_delete.mp3             →  "DELETE BY [N] WORDS"
  cmd_3_clear.mp3              →  "CLEAR"
  cmd_4_submit.mp3             →  "SUBMIT"
  cmd_5_skip.mp3               →  "SKIP"
  cmd_6_repeat_question.mp3    →  "REPEAT QUESTION"
  cmd_7_repeat_answer.mp3      →  "REPEAT ANSWER"
  cmd_8_skip_to_question.mp3   →  "SKIP TO QUESTION NUMBER [N]"
  cmd_9_help.mp3               →  "HELP HELP HELP"
  cmd_10_finish.mp3            →  "FINISH BY [registration number]"

── COMMAND AUDIO — TAMIL ───────────────────────────────
  (same names but with _ta before .mp3)

  cmd_1_stop_ta.mp3               →  "STOP STOP STOP" (Tamil)
  cmd_2_delete_ta.mp3             →  "DELETE BY [N] WORDS" (Tamil)
  cmd_3_clear_ta.mp3              →  "CLEAR" (Tamil)
  cmd_4_submit_ta.mp3             →  "SUBMIT" (Tamil)
  cmd_5_skip_ta.mp3               →  "SKIP" (Tamil)
  cmd_6_repeat_question_ta.mp3    →  "REPEAT QUESTION" (Tamil)
  cmd_7_repeat_answer_ta.mp3      →  "REPEAT ANSWER" (Tamil)
  cmd_8_skip_to_question_ta.mp3   →  "SKIP TO QUESTION NUMBER [N]" (Tamil)
  cmd_9_help_ta.mp3               →  "HELP HELP HELP" (Tamil)
  cmd_10_finish_ta.mp3            →  "FINISH BY [registration number]" (Tamil)

========================================================
  FULL FLOW (automatic, zero clicks after language pick):
========================================================

  1. Student opens /instructions
  2. LANGUAGE PICKER shown  →  student clicks English or Tamil
  3. ▶ intro audio plays (en or ta)
  4. Countdown: 3 … 2 … 1
  5. FOR EACH COMMAND (1 → 10):
       a. ▶ cmd_N_xxx[_ta].mp3 plays    (student listens)
       b. 🔴 Mic turns ON automatically
       c. Student speaks command (3 seconds)
       d. Recording saved to Supabase
       e. Next command starts automatically
  6. After 10th command → auto-navigates to /exam

  ⚠ If a file is missing, mic still activates — audio is just skipped.

========================================================
