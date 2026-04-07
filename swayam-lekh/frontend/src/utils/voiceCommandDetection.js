const normalize = (text) => (text || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

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
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
};

const isWordLikeMatch = (word, target) => {
  if (!word || !target) return false;
  if (word === target) return true;

  const distance = levenshtein(word, target);
  const threshold = Math.max(1, Math.floor(target.length * 0.35));
  return distance <= threshold;
};

export function countApproxCommandOccurrences(text, target, variants = []) {
  const normalized = normalize(text);
  if (!normalized) return 0;

  const words = normalized.split(' ').filter(Boolean);
  const allVariants = [target, ...variants].filter(Boolean);
  let count = 0;

  for (const word of words) {
    if (allVariants.some((variant) => isWordLikeMatch(word, normalize(variant)))) {
      count += 1;
    }
  }

  return count;
}
