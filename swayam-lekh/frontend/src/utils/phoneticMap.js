import { PHONETIC_DICTIONARY } from '../data/phoneticDictionary';

const replacements = [
  ['foto synthesis', 'photosynthesis'],
  ['foto sintha sis', 'photosynthesis'],
  ['mite o condria', 'mitochondria'],
  ['my to condria', 'mitochondria'],
  ['electro mag net ism', 'electromagnetism'],
  ['new tron', 'neutron'],
  ['pro tron', 'proton'],
  ['e lec tron', 'electron'],
  ['hydro jen', 'hydrogen'],
  ['oxy jen', 'oxygen'],
  ['nitro jen', 'nitrogen'],
  ['sul fyoo rik', 'sulphuric'],
  ['so dee um', 'sodium'],
  ['po tash ee um', 'potassium'],
  ['cal see um', 'calcium'],
  ['diff ren tiation', 'differentiation'],
  ['in te gra tion', 'integration'],
  ['co efficient', 'coefficient'],
  ['new tons', "newton's"],
  ['accel er ation', 'acceleration'],
  ['vel os ity', 'velocity'],
  ['mo men tum', 'momentum'],
  ['ther mo dy nam ics', 'thermodynamics'],
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildRegex = (phrase) => {
  const pattern = escapeRegExp(phrase.trim()).replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${pattern}\\b`, 'gi');
};

const compiled = replacements.map(([miss, correct]) => ({ regex: buildRegex(miss), correct }));
let compiledDictionaryEntries = null;

function getCompiledDictionaryEntries() {
  if (compiledDictionaryEntries) return compiledDictionaryEntries;

  compiledDictionaryEntries = Object.entries(PHONETIC_DICTIONARY || {})
    .map(([spoken, corrected]) => {
      const phrase = (spoken || '').trim();
      if (!phrase) return null;
      return {
        phrase,
        corrected,
        regex: buildRegex(phrase),
      };
    })
    .filter(Boolean)
    // Longer phrases first so "red planet" wins before "planet"
    .sort((a, b) => b.phrase.length - a.phrase.length);

  return compiledDictionaryEntries;
}

export function applyPhoneticMap(text = '') {
  if (!text) return '';

  let out = text;

  // Layer 1: large user-maintained dictionary (thousands of pronunciation variants)
  getCompiledDictionaryEntries().forEach(({ regex, corrected }) => {
    out = out.replace(regex, corrected);
  });

  // Layer 2: legacy fallback patterns
  compiled.forEach(({ regex, correct }) => {
    out = out.replace(regex, correct);
  });

  return out;
}

export function listPhoneticPatterns() {
  return replacements.map(([miss, correct]) => ({ miss, correct }));
}
