export const MATH_PATTERNS = [
  // ── 1. CHEMISTRY (Must be at the TOP) ──────────────────────
  {
    // Matches "h2", "O2", "H2SO4", "c6h12o6" (joined or spaced)
    // This turns h2so4 into H_{2}SO_{4}
    pattern: /([a-zA-Z]{1,2})\s?(\d+)/gi,
    replacement: (match, element, digits) => {
      const el = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
      return `${el}_{${digits}}`;
    }
  },
  { pattern: /\bgives\b|\byields\b|\breacts to form\b/gi, replacement: '\\rightarrow' },
  { pattern: /\bplus\b/gi, replacement: '+' }, // Needed for reactions like H2 + O2

  // ── 2. INTEGRALS ──────────────────────────────────────────
  {
    pattern: /integral from (.+?) to (.+?) of (.+?)(?:\s?dx|$)/gi,
    replacement: (m, lower, upper, expr) => `\\int_{${lower.trim()}}^{${upper.trim()}} ${expr.trim()} \\, dx`
  },
  {
    pattern: /integral of (.+?)(?:\s?dx|$)/gi,
    replacement: (m, expr) => `\\int ${expr.trim()} \\, dx`
  },
  { pattern: /\bintegral\b/gi, replacement: '\\int' },

  // ── 3. BRACKETS ───────────────────────────────────────────
  {
    pattern: /(?:square\s|round\s|curly\s)?brackets?\sopen|open\s(?:square\s|round\s|curly\s)?brackets?/gi,
    replacement: '('
  },
  {
    pattern: /(?:square\s|round\s|curly\s)?brackets?\sclose|close\s(?:square\s|round\s|curly\s)?brackets?/gi,
    replacement: ')'
  },
  { pattern: /open curly/gi, replacement: '{' },
  { pattern: /close curly/gi, replacement: '}' },

  // ── 4. OPERATORS & POWERS ─────────────────────────────────
  { pattern: /\bplus\s?(or\s)?minus\b/gi, replacement: '\\pm' },
  { pattern: /\bminus\s?(or\s)?plus\b/gi, replacement: '\\mp' },
  { pattern: /\b(is\s)?equal(s|\sto)?\b/gi, replacement: '=' },
  { pattern: /\bminus\b/gi, replacement: '-' },
  { pattern: /\binto\b|\btimes\b|\bmultiplied\s?by\b/gi, replacement: '\\times' },
  { pattern: /\bdivided\s?by\b|\bover\b/gi, replacement: '\\div' },
  { pattern: /\bnot\s?equal\b/gi, replacement: '\\neq' },
  {
    pattern: /(.+?) to the power (?:of\s)?(.+)/gi,
    replacement: (m, b, e) => `${b.trim()}^{${e.trim()}}`
  },
  { pattern: /(.+?)\s(?:squared?|square)\b/gi, replacement: (m, b) => `${b.trim()}^2` },
  { pattern: /(.+?)\s(?:cubed?|cube)\b/gi, replacement: (m, b) => `${b.trim()}^3` },
  { pattern: /square root of (.+)/gi, replacement: (m, e) => `\\sqrt{${e}}` },

  // ── 5. STRUCTURE & GREEK ──────────────────────────────────
  { pattern: /\bnew line\b|\bnewline\b|\bnext line\b/gi, replacement: '\\\\' },
  { pattern: /\bpi\b/gi, replacement: '\\pi' },
  { pattern: /\btheta\b/gi, replacement: '\\theta' },
  { pattern: /\balpha\b/gi, replacement: '\\alpha' },
  { pattern: /\bbeta\b/gi, replacement: '\\beta' },

  // ── 6. NUMBERS (Always LAST) ──────────────────────────────
  { pattern: /\bzero\b/gi, replacement: '0' },
  { pattern: /\bone\b/gi, replacement: '1' },
  { pattern: /\btwo\b/gi, replacement: '2' },
  { pattern: /\bthree\b/gi, replacement: '3' },
  { pattern: /\bfour\b/gi, replacement: '4' },
  { pattern: /\bfive\b/gi, replacement: '5' },

  // ── 8. CHEMISTRY ───────────────────────────────────────────
  { pattern: /\byields\b|\bgives\b|\bforms\b/gi, replacement: '\\rightarrow' },
  { pattern: /\breversible reaction\b|\bequilibrium\b/gi, replacement: '\\rightleftharpoons' },
  { pattern: /\bprecipitate\b/gi, replacement: '\\downarrow' },
  { pattern: /\bgas evolved\b|\bgas\b/gi, replacement: '\\uparrow' },
  // Match elements followed by a written number (e.g., "H two O" -> H_2 O)
  { 
    pattern: /\\?([A-Z][a-z]?)\s*(two|three|four|five|six|seven|eight|nine|ten)\b/gi, 
    replacement: (m, el, num) => {
      const map = {two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10'};
      return `${el}_{${map[num.toLowerCase()]}}`;
    }
  },
  // Match elements followed by a digit (e.g., "H 2" -> H_2)
  { pattern: /([A-Z][a-z]?)\s*([2-9])/gi, replacement: '$1_{$2}' },
];