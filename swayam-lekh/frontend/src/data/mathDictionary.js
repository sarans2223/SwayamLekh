// src/data/mathDictionary.js

export const MATH_PATTERNS = [
  // ── 1. INTEGRALS (Specific to General) ──────────────────────
  {
    // Matches: "integral from 0 to 1 of x squared dx"
    pattern: /integral from (.+?) to (.+?) of (.+?)(?:\s?dx|$)/gi,
    replacement: (m, lower, upper, expr) => `\\int_{${lower.trim()}}^{${upper.trim()}} ${expr.trim()} \\, dx`
  },
  {
    // Matches: "integral of sine x dx"
    pattern: /integral of (.+?)(?:\s?dx|$)/gi,
    replacement: (m, expr) => `\\int ${expr.trim()} \\, dx`
  },
  {
    // Fallback for just the word "integral"
    pattern: /\bintegral\b/gi,
    replacement: '\\int'
  },

  // ── 2. BRACKETS & MOD ───────────────────────────────────────
  {
    // Matches: "square bracket open", "open bracket", "bracket open"
    pattern: /(?:square\s|round\s|curly\s)?brackets?\sopen|open\s(?:square\s|round\s|curly\s)?brackets?/gi,
    replacement: '('
  },
  {
    pattern: /(?:square\s|round\s|curly\s)?brackets?\sclose|close\s(?:square\s|round\s|curly\s)?brackets?/gi,
    replacement: ')'
  },
  { pattern: /open curly/gi, replacement: '{' },
  { pattern: /close curly/gi, replacement: '}' },

  // ── 3. OPERATORS ──────────────────────────────────────────
  {
    // Matches: "plus minus" or "plus or minus"
    pattern: /\bplus\s?(or\s)?minus\b/gi,
    replacement: '\\pm'
  },
  {
    pattern: /\bminus\s?(or\s)?plus\b/gi,
    replacement: '\\mp'
  },
  {
    // Matches: "is equal to", "equals", "equal to"
    pattern: /\b(is\s)?equal(s|\sto)?\b/gi,
    replacement: '='
  },
  { pattern: /\bplus\b/gi, replacement: '+' },
  { pattern: /\bminus\b/gi, replacement: '-' },
  { pattern: /\binto\b|\btimes\b|\bmultiplied\s?by\b/gi, replacement: '\\times' },
  { pattern: /\bdivided\s?by\b|\bover\b/gi, replacement: '\\div' },
  { pattern: /\bnot\s?equal\b/gi, replacement: '\\neq' },

  // ── 4. POWERS & ROOTS ──────────────────────────────────────
  {
    pattern: /(.+?) to the power (?:of\s)?(.+)/gi,
    replacement: (m, b, e) => `${b.trim()}^{${e.trim()}}`
  },
  { pattern: /(.+?) squared/gi, replacement: (m, b) => `${b.trim()}^2` },
  { pattern: /(.+?) cubed/gi, replacement: (m, b) => `${b.trim()}^3` },
  { pattern: /square root of (.+)/gi, replacement: (m, e) => `\\sqrt{${e}}` },

  // ── 5. GREEK LETTERS ───────────────────────────────────────
  { pattern: /\bpi\b/gi, replacement: '\\pi' },
  { pattern: /\btheta\b/gi, replacement: '\\theta' },
  { pattern: /\balpha\b/gi, replacement: '\\alpha' },
  { pattern: /\bbeta\b/gi, replacement: '\\beta' },

  // ── 6. NUMBERS (Processed Last) ────────────────────────────
  { pattern: /\bzero\b/gi, replacement: '0' },
  { pattern: /\bone\b/gi, replacement: '1' },
  { pattern: /\btwo\b/gi, replacement: '2' },
  { pattern: /\bthree\b/gi, replacement: '3' },
  { pattern: /\bfour\b/gi, replacement: '4' },
  { pattern: /\bfive\b/gi, replacement: '5' }
];