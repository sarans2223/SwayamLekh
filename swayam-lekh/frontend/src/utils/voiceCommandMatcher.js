import { matchCommand } from './commandMatcher';

const normalize = (text) => (text || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/-/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasStandalonePhrase = (text, phrase) => {
  const pattern = new RegExp(`(^|\\s)${escapeRegex(phrase).replace(/\\\s+/g, '\\s+')}($|\\s)`);
  return pattern.test(text);
};

const COMMAND_HINTS = {
  stop: ['stop', 'stoop', 'stopp', 'top', 'cop', 'shtop', 'estop'],
  submit: ['submit', 'submitt', 'sobmit', 'sabmit', 'sub meet', 'submet', 'submeet', 'sumit', 'sabmeet', 'sub mit', 'some it'],
  skip: ['skip', 'skips', 'skip to', 'skip question', 'skip to question', 'skipp', 'kip', 'ship', 'schip', 'eskip', 'ischip'],
  'read back': ['repeat answer', 'repeat my answer', 'read back', 'readback', 'read bag', 'red back', 'reed back', 'read my answer'],
  delete: ['delete', 'delete last word', 'delete last', 'delete word', 'deleat', 'deeleat', 'dileet', 'each', 'each last', 'leech', 'delete words', 'dilate', 'delete last words'],
  finish: ['finish', 'finish exam', 'end exam', 'submit exam', 'finish now', 'end now'],
  repeat: ['repeat', 'repeet', 'repete', 're peat', 'ripeat', 'repit', 'ripit'],
  clear: ['clear', 'cleer', 'klear', 'cliar', 'kleer', 'claire'],
  flag: ['flag', 'flab', 'fleg', 'plag', 'flug', 'plug'],
  help: ['help', 'elp', 'halp', 'help help help', 'help help', 'helphelp', 'halp halp', 'elp elp'],
  'list commands': ['list commands', 'list the commands', 'show commands', 'show the commands', 'command list', 'commands list'],
  'skip skip': ['skip skip', 'skipskip'],
  start: ['start', 'staart', 'tart', 'estart', 'istart', 'estaan', 'estaat'],
  'go to': ['go to', 'goto', 'go two', 'go-to', 'gotu', 'gato'],
};

function countWordOccurrences(normalized, targetWords) {
  const words = normalized.split(' ').filter(Boolean);
  let count = 0;

  for (const token of words) {
    if (targetWords.some((hint) => normalize(hint) === token)) {
      count += 1;
    }
  }

  return count;
}

export function detectVoiceCommand(transcript) {
  const normalized = normalize(transcript);
  if (!normalized) return null;
  const words = normalized.split(' ').filter(Boolean);

  const direct = matchCommand(normalized);
  if (direct) return direct;

  for (const [command, hints] of Object.entries(COMMAND_HINTS)) {
    const words = hints.map(normalize).filter(Boolean);
    if (!words.length) continue;

    if (countWordOccurrences(normalized, words) >= 2 && (command === 'stop' || command === 'help')) {
      return command;
    }

    for (const hint of words) {
      if (!hint) continue;

      const hintWords = hint.split(' ').filter(Boolean).length;
      const isCommandLikeLength = words.length <= Math.max(4, hintWords + 2);
      if (hasStandalonePhrase(normalized, hint) && isCommandLikeLength) {
        return command;
      }
    }
  }

  return null;
}
