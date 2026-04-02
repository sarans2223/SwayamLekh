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

const buildRegex = (phrase) => {
  const pattern = phrase.trim().replace(/\s+/g, '\\s*');
  return new RegExp(`\\b${pattern}\\b`, 'gi');
};

const compiled = replacements.map(([miss, correct]) => ({ regex: buildRegex(miss), correct }));

export function applyPhoneticMap(text = '') {
  if (!text) return '';
  let out = text;
  compiled.forEach(({ regex, correct }) => {
    out = out.replace(regex, correct);
  });
  return out;
}

export function listPhoneticPatterns() {
  return replacements.map(([miss, correct]) => ({ miss, correct }));
}
