import React from 'react';

export default function EquationRenderer({ latex, inline = false }) {
  if (!latex) return null;

  // Simple string sanitization to remove standard bounding delimiters if passed
  const clean = latex.replace(/^\$\$?|\\\[|\\]|\$\$?$/g, '').trim();

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