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
  stop: ['stop', 'stoop', 'stopp', 'top', 'cop', 'shtop', 'estop', 'exit', 'close'],
  submit: ['submit', 'submitt', 'sobmit', 'sabmit', 'sub meet', 'submet', 'submeet', 'sumit', 'sabmeet', 'sub mit', 'some it'],
  skip: ['skip', 'skips', 'skip to', 'skip question', 'skip to question', 'skipp', 'kip', 'ship', 'schip', 'eskip', 'ischip'],
  'read back': ['repeat answer', 'repeat my answer', 'read back', 'readback', 'read bag', 'red back', 'reed back', 'read my answer'],
  delete: ['delete', 'delete last word', 'delete last', 'delete word', 'deleat', 'deeleat', 'dileet', 'each', 'each last', 'leech', 'delete words', 'dilate', 'delete last words'],
  finish: ['finish', 'finish exam', 'end exam', 'submit exam', 'finish now', 'end now'],
  repeat: ['repeat', 'repeet', 'repete', 're peat', 'ripeat', 'repit', 'ripit'],
  clear: ['clear', 'cleer', 'klear', 'cliar', 'kleer', 'claire'],
  flag: ['flag', 'flab', 'fleg', 'plag', 'flug', 'plug'],
  help: [
    'help', 'elp', 'halp', 'and', 'hand', 'end', 'held', 'held me', 'help me', 
    'help help help', 'help help', 'helphelp', 'halp halp', 'elp elp',
    'alpha', 'health', 'eld', 'alp', 'alpa',
    'udhavi', 'theriyala', 'help panunga', 'assist', 'assistant'
  ],
  'list commands': ['list commands', 'list the commands', 'show commands', 'show the commands', 'command list', 'commands list'],
  'skip skip': ['skip skip', 'skipskip'],
  start: ['start', 'staart', 'tart', 'estart', 'istart', 'estaan', 'estaat'],
  'go to': ['go to', 'goto', 'go two', 'go-to', 'gotu', 'gato'],
  'time left': ['time left', 'remaining time', 'how much time', 'test time', 'exam time', 'time remaining', 'what is the time'],
};

function countWordOccurrences(normalized, targetWords) {
  const inputWords = normalized.split(' ').filter(Boolean);
  let count = 0;

  for (const token of inputWords) {
    if (targetWords.some((hint) => normalize(hint) === token)) {
      count += 1;
    }
  }

  return count;
}

export function detectVoiceCommand(transcript) {
  const normalized = normalize(transcript);
  if (!normalized) return null;
  const inputWords = normalized.split(' ').filter(Boolean);

  const direct = matchCommand(normalized);
  if (direct) return direct;

  for (const [command, hints] of Object.entries(COMMAND_HINTS)) {
    const hintList = hints.map(normalize).filter(Boolean);
    if (!hintList.length) continue;

    if (countWordOccurrences(normalized, hintList) >= 2 && (command === 'stop' || command === 'help')) {
      return command;
    }

    for (const hint of hintList) {
      if (!hint) continue;

      const hintWordCount = hint.split(' ').filter(Boolean).length;
      const isCommandLikeLength = inputWords.length <= Math.max(4, hintWordCount + 2);
      if (hasStandalonePhrase(normalized, hint) && isCommandLikeLength) {
        return command;
      }
    }
  }

  return null;
}
