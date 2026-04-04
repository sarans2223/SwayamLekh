let ttsPlaying = false;

export function setTTSPlaying(value) {
  ttsPlaying = value;
  console.log(`[AudioState] TTS playing: ${value} - mic ${value ? 'MUTED' : 'ACTIVE'}`);
}

export function isTTSPlaying() {
  return ttsPlaying;
}
