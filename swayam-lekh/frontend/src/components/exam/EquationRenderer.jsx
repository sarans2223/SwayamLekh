import React from 'react';

const SUPERSCRIPT_MAP = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const SUBSCRIPT_MAP = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

function normalizeUnicodeMath(input) {
  if (!input) return input;

  return input
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (char) => `^{${SUPERSCRIPT_MAP[char] || char}}`)
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) => `_{${SUBSCRIPT_MAP[char] || char}}`);
}

export default function EquationRenderer({ latex, inline = false }) {
  if (!latex) return null;

  // Simple string sanitization to remove standard bounding delimiters if passed
  let clean = latex.replace(/^\$\$?|\\\[|\\]|\$\$?$/g, '').trim();
  clean = normalizeUnicodeMath(clean);

  let htmlResult = latex;
  let hasError = false;

  if (window.katex) {
    try {
      htmlResult = window.katex.renderToString(clean, {
        displayMode: !inline,
        throwOnError: false,
      });
    } catch (e) {
      console.error("KaTeX Error:", e);
      hasError = true;
    }
  }

  if (hasError || !window.katex) {
    return <span style={{ fontFamily: 'monospace', color: 'var(--red)' }}>[Eq: {latex}]</span>;
  }

  const Tag = inline ? 'span' : 'div';
  return <Tag dangerouslySetInnerHTML={{ __html: htmlResult }} style={{ padding: inline ? '0' : '16px 0', overflowX: 'auto', textAlign: inline ? 'inherit' : 'center' }} />;
}