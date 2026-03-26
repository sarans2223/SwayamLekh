export function cleanLatex(raw) {
  if (!raw) return "";
  return raw.replace(/$$/g, ''); // remove default dollar signs if any
}

export function renderLatexToString(latex) {
  if (!window.katex) return latex;
  try {
    return window.katex.renderToString(cleanLatex(latex), {
      throwOnError: false,
      displayMode: false
    });
  } catch(e) {
    return latex;
  }
}

export function hasLatex(text) {
  if (!text) return false;
  return text.includes('\') || text.includes('_') || text.includes('^');
}