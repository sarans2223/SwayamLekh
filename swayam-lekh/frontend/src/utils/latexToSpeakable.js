export function latexToSpeakable(input = '') {
  let text = String(input || '');

  // Remove \text{} wrappers while preserving readable content.
  text = text.replace(/\\text\s*\{([^{}]*)\}/g, '$1');

  // Fractions and limits before generic cleanup.
  text = text.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 divided by $2');
  text = text.replace(/\\lim_\{\s*([^{}]+)\s*\\to\s*([^{}]+)\s*\}/g, 'limit $1 tends to $2');

  // Powers.
  text = text.replace(/\^2\b/g, ' squared');
  text = text.replace(/\^3\b/g, ' cubed');
  text = text.replace(/\^\{\s*([^{}]+)\s*\}/g, ' raised to the power $1');

  // Core math symbols/functions.
  text = text.replace(/\\int\b/g, 'integral of');
  text = text.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'square root of $1');
  text = text.replace(/\\sin\b/g, 'sin');
  text = text.replace(/\\cos\b/g, 'cos');
  text = text.replace(/\\tan\b/g, 'tan');
  text = text.replace(/\\times\b/g, 'multiplied by');
  text = text.replace(/\\div\b/g, 'divided by');
  text = text.replace(/\\angle\b/g, 'angle');
  text = text.replace(/\\circ\b/g, 'degrees');
  text = text.replace(/\\to\b/g, 'tends to');
  text = text.replace(/\\pi\b/g, 'pi');

  // Read triangle side names clearly as letters instead of merged tokens.
  text = text.replace(/\b(AB|BC|AC)\b/g, (match) => match.split('').join(' '));

  // Final cleanup requested: remove remaining slashes and braces.
  text = text
    .replace(/\\/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

export default latexToSpeakable;
