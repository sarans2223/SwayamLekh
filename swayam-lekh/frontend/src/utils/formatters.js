export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function truncateText(text, maxLen) {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + "...";
}

export function formatTimeToSpeech(seconds, lang = 'en') {
  if (seconds <= 0) {
    return lang === 'ta' ? 'தேர்வு நேரம் முடிந்துவிட்டது' : 'Exam time is up';
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];

  if (lang === 'ta') {
    if (h > 0) parts.push(`${h} மணிநேரம்`);
    if (m > 0) parts.push(`${m} நிமிடங்கள்`);
    if (s > 0) parts.push(`${s} விநாடிகள்`);
    
    if (parts.length === 0) return '0 விநாடிகள் மீதம் உள்ளது';
    if (parts.length === 1) return `${parts[0]} மீதம் உள்ளது`;
    
    return `${parts.slice(0, -1).join(', ')} மற்றும் ${parts[parts.length - 1]} மீதம் உள்ளது`;
  }

  // English
  if (h > 0) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
  if (s > 0) parts.push(`${s} second${s > 1 ? 's' : ''}`);

  if (parts.length === 0) return '0 seconds remaining';
  if (parts.length === 1) return `${parts[0]} remaining`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]} remaining`;
}