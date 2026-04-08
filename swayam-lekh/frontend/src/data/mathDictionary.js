export const MATH_PATTERNS = [
  // ── INTEGRALS ──────────────────────────────────────────

  // "integral from a to b of 5 x to the power 2 dx" → ∫ₐᵇ 5x² dx
  {
    pattern: /integral from (.+?) to (.+?) of (.+?) dx/gi,
    replacement: (m, lower, upper, expr) =>
      `\\int_{${lower}}^{${upper}} ${expr} \\, dx`
  },
  // "integral from a to b of f x" → ∫ₐᵇ f(x) dx
  {
    pattern: /integral from (.+?) to (.+?) of (.+)/gi,
    replacement: (m, lower, upper, expr) =>
      `\\int_{${lower}}^{${upper}} ${expr} \\, dx`
  },
  // "integral of x squared" → ∫ x² dx
  {
    pattern: /integral of (.+)/gi,
    replacement: (m, expr) => `\\int ${expr} \\, dx`
  },

  // ── LIMITS ─────────────────────────────────────────────

  // "limit x tends to zero of f x" → lim(x→0) f(x)
  {
    pattern: /limit (.+?) tends to (.+?) of (.+)/gi,
    replacement: (m, variable, value, expr) =>
      `\\lim_{${variable} \\to ${value}} ${expr}`
  },
  // "limit x tends to infinity" → lim(x→∞)
  {
    pattern: /limit (.+?) tends to infinity/gi,
    replacement: (m, variable) => `\\lim_{${variable} \\to \\infty}`
  },
  {
    pattern: /limit (.+?) tends to zero/gi,
    replacement: (m, variable) => `\\lim_{${variable} \\to 0}`
  },

  // ── DERIVATIVES ────────────────────────────────────────

  {
    pattern: /d squared (.+?) by d (.+?) squared/gi,
    replacement: (m, num, den) => `\\frac{d^2${num}}{d${den}^2}`
  },
  {
    pattern: /d (.+?) by d (.+)/gi,
    replacement: (m, num, den) => `\\frac{d${num}}{d${den}}`
  },
  {
    pattern: /dy by dx/gi,
    replacement: '\\frac{dy}{dx}'
  },
  {
    pattern: /d y by d x/gi,
    replacement: '\\frac{dy}{dx}'
  },
  {
    pattern: /partial of (.+?) with respect to (.+)/gi,
    replacement: (m, func, variable) => `\\frac{\\partial ${func}}{\\partial ${variable}}`
  },

  // ── FRACTIONS ──────────────────────────────────────────

  // "a plus b by c" → (a+b)/c
  {
    pattern: /(.+?) plus (.+?) by (.+)/gi,
    replacement: (m, a, b, c) => `\\frac{${a}+${b}}{${c}}`
  },
  {
    pattern: /(.+?) minus (.+?) by (.+)/gi,
    replacement: (m, a, b, c) => `\\frac{${a}-${b}}{${c}}`
  },
  // "x by y" → x/y
  {
    pattern: /(.+?) by (.+)/gi,
    replacement: (m, num, den) => `\\frac{${num}}{${den}}`
  },
  {
    pattern: /fraction (.+?) over (.+)/gi,
    replacement: (m, num, den) => `\\frac{${num}}{${den}}`
  },
  {
    pattern: /numerator (.+?) denominator (.+)/gi,
    replacement: (m, num, den) => `\\frac{${num}}{${den}}`
  },
  { pattern: /one half/gi, replacement: '\\frac{1}{2}' },
  { pattern: /one third/gi, replacement: '\\frac{1}{3}' },
  { pattern: /two thirds/gi, replacement: '\\frac{2}{3}' },
  { pattern: /one quarter/gi, replacement: '\\frac{1}{4}' },
  { pattern: /three quarters/gi, replacement: '\\frac{3}{4}' },
  { pattern: /pi by two/gi, replacement: '\\frac{\\pi}{2}' },
  { pattern: /pi by four/gi, replacement: '\\frac{\\pi}{4}' },
  { pattern: /pi over two/gi, replacement: '\\frac{\\pi}{2}' },
  { pattern: /pi over four/gi, replacement: '\\frac{\\pi}{4}' },
  { pattern: /two pi/gi, replacement: '2\\pi' },

  // ── POWERS AND ROOTS ───────────────────────────────────

  // "x to the power n minus 1" → x^{n-1}

  {
    pattern: /(.+?) to the power (.+?) minus (.+)/gi,
    replacement: (m, base, exp, sub) => `${base}^{${exp}-${sub}}`
  },
  {
    pattern: /(.+?) to the power (.+?) plus (.+)/gi,
    replacement: (m, base, exp, add) => `${base}^{${exp}+${add}}`
  },
  // "x to the power n" → x^n
  {
    pattern: /(.+?) to the power (.+)/gi,
    replacement: (m, base, exp) => `${base}^{${exp}}`
  },
  // "x squared" → x² (works for ANY base: a squared, sin theta squared, 5 squared)
  {
    pattern: /(.+?) squared/gi,
    replacement: (m, base) => `${base}^2`
  },
  // "x cubed" → x³
  {
    pattern: /(.+?) cubed/gi,
    replacement: (m, base) => `${base}^3`
  },
  // "square root of x plus y" → √(x+y)
  {
    pattern: /square root of (.+)/gi,
    replacement: (m, expr) => `\\sqrt{${expr}}`
  },
  {
    pattern: /root over (.+)/gi,
    replacement: (m, expr) => `\\sqrt{${expr}}`
  },
  // "cube root of x" → ∛x
  {
    pattern: /cube root of (.+)/gi,
    replacement: (m, expr) => `\\sqrt[3]{${expr}}`
  },
  // "nth root of x" → ⁿ√x
  {
    pattern: /(.+?) root of (.+)/gi,
    replacement: (m, n, expr) => `\\sqrt[${n}]{${expr}}`
  },

  // ── SUBSCRIPTS ─────────────────────────────────────────

  {
    pattern: /(.+?) subscript (.+)/gi,
    replacement: (m, base, sub) => `${base}_{${sub}}`
  },

  // ── TRIGONOMETRY ───────────────────────────────────────

  { pattern: /sin inverse (.+)/gi, replacement: (m, x) => `\\sin^{-1}(${x})` },
  { pattern: /cos inverse (.+)/gi, replacement: (m, x) => `\\cos^{-1}(${x})` },
  { pattern: /tan inverse (.+)/gi, replacement: (m, x) => `\\tan^{-1}(${x})` },
  { pattern: /sin squared (.+)/gi, replacement: (m, x) => `\\sin^2(${x})` },
  { pattern: /cos squared (.+)/gi, replacement: (m, x) => `\\cos^2(${x})` },
  { pattern: /tan squared (.+)/gi, replacement: (m, x) => `\\tan^2(${x})` },
  { pattern: /sin (.+)/gi, replacement: (m, x) => `\\sin(${x})` },
  { pattern: /cos (.+)/gi, replacement: (m, x) => `\\cos(${x})` },
  { pattern: /tan (.+)/gi, replacement: (m, x) => `\\tan(${x})` },
  { pattern: /cosec (.+)/gi, replacement: (m, x) => `\\csc(${x})` },
  { pattern: /sec (.+)/gi, replacement: (m, x) => `\\sec(${x})` },
  { pattern: /cot (.+)/gi, replacement: (m, x) => `\\cot(${x})` },
  { pattern: /log (.+)/gi, replacement: (m, x) => `\\log(${x})` },
  { pattern: /ln (.+)/gi, replacement: (m, x) => `\\ln(${x})` },

  // ── BRACKETS ───────────────────────────────────────────

  { pattern: /brackets? open/gi, replacement: '(' },
  { pattern: /open brackets?/gi, replacement: '(' },
  { pattern: /brackets? close/gi, replacement: ')' },
  { pattern: /close brackets?/gi, replacement: ')' },
  { pattern: /open curly/gi, replacement: '{' },
  { pattern: /close curly/gi, replacement: '}' },
  { pattern: /mod (.+)/gi, replacement: (m, x) => `|${x}|` },
  { pattern: /absolute value of (.+)/gi, replacement: (m, x) => `|${x}|` },

  // ── GREEK LETTERS ──────────────────────────────────────

  { pattern: /\balpha\b/gi, replacement: '\\alpha' },
  { pattern: /\bbeta\b/gi, replacement: '\\beta' },
  { pattern: /\bgamma\b/gi, replacement: '\\gamma' },
  { pattern: /\bGamma\b/g, replacement: '\\Gamma' },
  { pattern: /\bdelta\b/gi, replacement: '\\delta' },
  { pattern: /\bDelta\b/g, replacement: '\\Delta' },
  { pattern: /\bepsilon\b/gi, replacement: '\\epsilon' },
  { pattern: /\btheta\b/gi, replacement: '\\theta' },
  { pattern: /\bTheta\b/g, replacement: '\\Theta' },
  { pattern: /\blambda\b/gi, replacement: '\\lambda' },
  { pattern: /\bmu\b/gi, replacement: '\\mu' },
  { pattern: /\bsigma\b/gi, replacement: '\\sigma' },
  { pattern: /\bSigma\b/g, replacement: '\\Sigma' },
  { pattern: /\bphi\b/gi, replacement: '\\phi' },
  { pattern: /\bPhi\b/g, replacement: '\\Phi' },
  { pattern: /\bomega\b/gi, replacement: '\\omega' },
  { pattern: /\bOmega\b/g, replacement: '\\Omega' },
  { pattern: /\bpi\b/gi, replacement: '\\pi' },
  { pattern: /\bPi\b/g, replacement: '\\Pi' },
  { pattern: /\brho\b/gi, replacement: '\\rho' },
  { pattern: /\beta\b/gi, replacement: '\\eta' },
  { pattern: /\bzeta\b/gi, replacement: '\\zeta' },
  { pattern: /\bkappa\b/gi, replacement: '\\kappa' },
  { pattern: /\bxi\b/gi, replacement: '\\xi' },
  { pattern: /\bpsi\b/gi, replacement: '\\psi' },
  { pattern: /\bchi\b/gi, replacement: '\\chi' },
  { pattern: /\btau\b/gi, replacement: '\\tau' },
  { pattern: /\bnu\b/gi, replacement: '\\nu' },

  // ── BASIC OPERATORS ────────────────────────────────────

  { pattern: /\bplus or minus\b/gi, replacement: '\\pm' },
  { pattern: /\bminus or plus\b/gi, replacement: '\\mp' },
  { pattern: /\bplus\b/gi, replacement: '+' },
  { pattern: /\bminus\b/gi, replacement: '-' },
  { pattern: /\bmultiplied by\b/gi, replacement: '\\times' },
  { pattern: /\bmultiplied\b/gi, replacement: '\\times' },
  { pattern: /\btimes\b/gi, replacement: '\\times' },
  { pattern: /\bdivided by\b/gi, replacement: '\\div' },
  { pattern: /\bdivided\b/gi, replacement: '\\div' },
  { pattern: /\bnot equal\b/gi, replacement: '\\neq' },
  { pattern: /\bgreater than or equal\b/gi, replacement: '\\geq' },
  { pattern: /\bless than or equal\b/gi, replacement: '\\leq' },
  { pattern: /\bgreater than\b/gi, replacement: '>' },
  { pattern: /\bless than\b/gi, replacement: '<' },
  { pattern: /\bapproximately\b/gi, replacement: '\\approx' },
  { pattern: /\bis equal to\b/gi, replacement: ' = ' },
  { pattern: /\bis equal\b/gi, replacement: ' = ' },
  { pattern: /\bequal to\b/gi, replacement: ' = ' },
  { pattern: /\bequals\b/gi, replacement: ' = ' },

  // ── SET THEORY AND LOGIC ───────────────────────────────

  { pattern: /\bbelongs to\b/gi, replacement: '\\in' },
  { pattern: /\bdoes not belong to\b/gi, replacement: '\\notin' },
  { pattern: /\bsubset of\b/gi, replacement: '\\subset' },
  { pattern: /\bunion\b/gi, replacement: '\\cup' },
  { pattern: /\bintersection\b/gi, replacement: '\\cap' },
  { pattern: /\bfor all\b/gi, replacement: '\\forall' },
  { pattern: /\bthere exists\b/gi, replacement: '\\exists' },
  { pattern: /\btherefore\b/gi, replacement: '\\therefore' },
  { pattern: /\bbecause\b/gi, replacement: '\\because' },
  { pattern: /\bimplies\b/gi, replacement: '\\Rightarrow' },
  { pattern: /\bif and only if\b/gi, replacement: '\\Leftrightarrow' },
  { pattern: /\bnot\b/gi, replacement: '\\neg' },
  { pattern: /\band\b/gi, replacement: '\\wedge' },
  { pattern: /\bor\b/gi, replacement: '\\vee' },

  // ── SPECIAL SYMBOLS ────────────────────────────────────

  { pattern: /\binfinity\b/gi, replacement: '\\infty' },
  { pattern: /\btranspose of (.+)/gi, replacement: (m, x) => `${x}^T` },
  { pattern: /\binverse of (.+)/gi, replacement: (m, x) => `${x}^{-1}` },
  { pattern: /\bdeterminant of (.+)/gi, replacement: (m, x) => `\\det(${x})` },
  { pattern: /\bvector (.+)/gi, replacement: (m, x) => `\\vec{${x}}` },
  { pattern: /\bhat (.+)/gi, replacement: (m, x) => `\\hat{${x}}` },
  { pattern: /\bbar (.+)/gi, replacement: (m, x) => `\\bar{${x}}` },

  // ── SUMMATION AND PRODUCT ──────────────────────────────

  {
    pattern: /sum from (.+?) equals (.+?) to (.+?) of (.+)/gi,
    replacement: (m, variable, lower, upper, expr) =>
      `\\sum_{${variable}=${lower}}^{${upper}} ${expr}`
  },
  {
    pattern: /product from (.+?) equals (.+?) to (.+?) of (.+)/gi,
    replacement: (m, variable, lower, upper, expr) =>
      `\\prod_{${variable}=${lower}}^{${upper}} ${expr}`
  },

  // ── NUMBER WORDS TO SYMBOLS ────────────────────────────

  { pattern: /\bzero\b/gi, replacement: '0' },
  { pattern: /\bone\b/gi, replacement: '1' },
  { pattern: /\btwo\b/gi, replacement: '2' },
  { pattern: /\bthree\b/gi, replacement: '3' },
  { pattern: /\bfour\b/gi, replacement: '4' },
  { pattern: /\bfive\b/gi, replacement: '5' },
  { pattern: /\bsix\b/gi, replacement: '6' },
  { pattern: /\bseven\b/gi, replacement: '7' },
  { pattern: /\beight\b/gi, replacement: '8' },
  { pattern: /\bnine\b/gi, replacement: '9' },
  { pattern: /\bten\b/gi, replacement: '10' },
];
