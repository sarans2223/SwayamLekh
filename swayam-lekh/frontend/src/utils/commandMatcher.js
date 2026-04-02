// CommandMatcher: accent-tolerant command detection with exact + fuzzy Levenshtein.
const COMMAND_VARIANTS = [
  { name: 'stop', variants: ['stop', 'stoop', 'stopp', 'top', 'cop', 'shtop', 'estop'] },
  {
    name: 'submit',
    variants: [
      'submit', 'submitt', 'sobmit', 'sabmit', 'sub meet', 'submet', 'submeet', 'sumit',
      'sabmeet', 'sub mit', 'some it'
    ]
  },
  {
    name: 'skip',
    variants: [
      'skip', 'skip to', 'skip question', 'skip to question', 'skipp', 'kip', 'ship', 'schip', 'eskip', 'ischip'
    ]
  },
  {
    name: 'read back',
    variants: ['repeat answer', 'repeat my answer', 'read back', 'readback', 'read bag', 'red back', 'reed back', 'read my answer']
  },
  { name: 'repeat', variants: ['repeat', 'repeet', 'repete', 're peat', 'ripeat', 'repit', 'ripit'] },
  { name: 'clear', variants: ['clear', 'cleer', 'klear', 'cliar', 'kleer', 'claire'] },
  { name: 'flag', variants: ['flag', 'flab', 'fleg', 'plag', 'flug', 'plug'] },
  {
    name: 'help',
    variants: ['help', 'elp', 'halp', 'help help help', 'help help', 'helphelp', 'halp halp', 'elp elp']
  },
  { name: 'start', variants: ['start', 'staart', 'tart', 'estart', 'istart', 'estaan', 'estaat'] },
  { name: 'go to', variants: ['go to', 'goto', 'go two', 'go-to', 'gotu', 'gato'] }
];

const normalize = (text) => (text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[a.length][b.length];
};

export function isLikelyCommand(transcript) {
  const normalized = normalize(transcript);
  if (!normalized) return false;
  const words = normalized.split(' ').filter(Boolean);
  return words.length > 0 && words.length <= 4;
}

export function matchCommand(transcript) {
  const normalized = normalize(transcript);
  if (!normalized) {
    console.log('[CommandMatcher] no match (empty transcript)');
    return null;
  }

  // Guard: multi-word phrases with no command-like tokens should not be treated as commands
  const words = normalized.split(' ').filter(Boolean);
  const commandTokens = new Set(['stop', 'submit', 'skip', 'repeat', 'question', 'answer', 'option', 'clear', 'flag', 'help', 'start', 'go', 'spell', 'delete', 'finish', 'section', 'back', 'previous', 'next', 'read']);
  if (words.length > 1 && !words.some((w) => commandTokens.has(w))) {
    console.log(`[CommandMatcher] no match (multi-word non-command phrase): "${transcript}"`);
    return null;
  }

  // Pass 1: exact substring match against variants
  for (const cmd of COMMAND_VARIANTS) {
    for (const variant of cmd.variants) {
      const variantNorm = normalize(variant);
      if (variantNorm && normalized.includes(variantNorm)) {
        console.log(`[CommandMatcher] exact match: ${cmd.name} via "${variant}" in "${transcript}"`);
        return cmd.name;
      }
    }
  }

  // Pass 2: fuzzy match using Levenshtein when short enough
  if (!isLikelyCommand(normalized)) {
    console.log(`[CommandMatcher] no match (too long for fuzzy): "${transcript}"`);
    return null;
  }

  for (const cmd of COMMAND_VARIANTS) {
    for (const variant of cmd.variants) {
      const variantNorm = normalize(variant);
      if (!variantNorm) continue;
      const distance = levenshtein(normalized, variantNorm);
      const threshold = Math.floor(variantNorm.length * 0.35);
      if (distance <= threshold) {
        console.log(`[CommandMatcher] fuzzy match: ${cmd.name} (distance ${distance} ≤ threshold ${threshold}) for "${transcript}" against "${variant}"`);
        return cmd.name;
      }
    }
  }

  console.log(`[CommandMatcher] no match for "${transcript}"`);
  return null;
}
