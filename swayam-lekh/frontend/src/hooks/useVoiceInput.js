import { applyPhoneticMap } from '../utils/phoneticMap';
import { correctTranscript } from '../utils/correctTranscript';

// Lightweight placeholder; real voice capture handled elsewhere. Expose the
// correction pipeline for any hook/component that wants to reuse it.
export function useVoiceInput() {
  const listening = false;
  const transcript = '';

  const start = () => {
    console.log('Mock start VoiceInput');
  };

  const stop = () => {
    console.log('Mock stop VoiceInput');
  };

  const runCorrection = async (rawText, questionText, subject) => {
    const mapped = applyPhoneticMap(rawText);
    return correctTranscript(mapped, questionText, subject);
  };

  return { listening, start, stop, transcript, runCorrection };
}