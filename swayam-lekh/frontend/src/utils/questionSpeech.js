import { latexToSpeakable } from './latexToSpeakable';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function normalizeMathSymbols(text) {
  return latexToSpeakable((text || '')
    .replace(/÷/g, ' divided by ')
    .replace(/×/g, ' times ')
    .replace(/→/g, ' goes to ')
    .replace(/-/g, ' minus ')
    .replace(/−/g, ' minus ')
    .replace(/=/g, ' equals ')
    .replace(/\[/g, ' open bracket ')
    .replace(/\]/g, ' close bracket ')
    .replace(/\(/g, ' open bracket ')
    .replace(/\)/g, ' close bracket ')
    .replace(/\bpi\b/gi, ' pi ')
    .replace(/\s+/g, ' ')
    .trim());
}

function buildOptionsSpeech(options = []) {
  return options
    .slice(0, OPTION_LABELS.length)
    .map((opt, index) => `Option ${OPTION_LABELS[index]}: ${normalizeMathSymbols(opt)}`)
    .join('. ');
}

export function buildQuestionVoiceText(question, idx) {
  const qNumber = Number.isInteger(idx) && idx >= 0 ? `Question ${idx + 1}. ` : '';
  const promptText = normalizeMathSymbols(question?.prompt || '');
  const bodyText = normalizeMathSymbols(question?.text || '');

  const promptLower = promptText.toLowerCase();
  const bodyLower = bodyText.toLowerCase();
  const shouldIncludePrompt = promptText && (!bodyLower || !bodyLower.includes(promptLower));
  const baseText = [shouldIncludePrompt ? promptText : '', bodyText].filter(Boolean).join('. ');
  if (!baseText) return qNumber.trim();

  if (!Array.isArray(question?.options) || !question.options.length) {
    return `${qNumber}${baseText}`.trim();
  }

  const optionsReadout = buildOptionsSpeech(question.options);
  return optionsReadout ? `${qNumber}${baseText}. ${optionsReadout}` : `${qNumber}${baseText}`;
}
