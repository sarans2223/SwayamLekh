import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

const isMock = supabaseUrl.includes('placeholder');

// ─── Photo upload ─────────────────────────────────────────────────────────────
export const uploadPhoto = async (regNo, name, dataUrl) => {
  if (isMock) { console.warn('[MOCK] Photo upload skipped'); return true; }
  try {
    const res      = await fetch(dataUrl);
    const blob     = await res.blob();
    const fileName = `${regNo}_${(name || 'student').replace(/\s+/g, '_')}_${Date.now()}.jpg`;

    const { data: up, error: upErr } = await supabase.storage
      .from('student-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
    if (upErr) throw upErr;

    await supabase.from('student_verifications').upsert({
      register_no:  regNo,
      student_name: name,
      photo_path:   up.path,
      captured_at:  new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('uploadPhoto error:', err);
    return false;
  }
};

// ─── Voice Profile (biometric) ────────────────────────────────────────────────

/**
 * Upload one voice sample blob + extracted features to Supabase.
 * Table: voice_profiles   Storage bucket: voice-profiles
 */
export const saveVoiceProfile = async (regNo, name, commandIndex, commandText, audioBlob, features) => {
  if (isMock) {
    console.warn('[MOCK] saveVoiceProfile skipped — no Supabase config');
    return true;
  }
  try {
    const fileName = `${regNo}/cmd_${commandIndex}_${Date.now()}.webm`;

    const { data: up, error: upErr } = await supabase.storage
      .from('voice-profiles')
      .upload(fileName, audioBlob, { contentType: 'audio/webm', upsert: false });
    if (upErr) throw upErr;

    const { error: dbErr } = await supabase.from('voice_profiles').insert([{
      register_no:       regNo,
      student_name:      name,
      command_index:     commandIndex,
      command_text:      commandText,
      storage_path:      up.path,
      mfcc_features:     features?.mfcc      ?? null,
      pitch_mean:        features?.pitch_mean ?? null,
      pitch_std:         features?.pitch_std  ?? null,
      energy_mean:       features?.energy_mean ?? null,
      zero_crossing_rate: features?.zcr       ?? null,
      spectral_centroid: features?.spectral_centroid ?? null,
    }]);
    if (dbErr) throw dbErr;

    return true;
  } catch (err) {
    console.error('saveVoiceProfile error:', err);
    return false;
  }
};

/**
 * Fetch all stored voice profiles for a student.
 * Returns array of rows with mfcc_features etc.
 */
export const getVoiceProfiles = async (regNo) => {
  if (isMock) {
    console.warn('[MOCK] getVoiceProfiles — returning empty');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('voice_profiles')
      .select('*')
      .eq('register_no', regNo)
      .order('command_index', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getVoiceProfiles error:', err);
    return [];
  }
};

/**
 * Log a malpractice event to the malpractice_logs table.
 */
export const logMalpractice = async (regNo, name, similarityScore) => {
  if (isMock) {
    console.warn('[MOCK] logMalpractice skipped');
    return true;
  }
  try {
    const { error } = await supabase.from('malpractice_logs').insert([{
      register_no:      regNo,
      student_name:     name,
      detected_at:      new Date().toISOString(),
      similarity_score: similarityScore,
      action_taken:     'alarm_triggered',
    }]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('logMalpractice error:', err);
    return false;
  }
};

// ─── Legacy wrappers (InstructionsPage compatibility) ────────────────────────
export const uploadVoiceCommand    = saveVoiceProfile;
export const uploadVoiceVerification = saveVoiceProfile;
