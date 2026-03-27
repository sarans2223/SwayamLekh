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
  try {
    const formData = new FormData();
    formData.append('regNo', regNo);
    formData.append('name', name);
    formData.append('commandIndex', commandIndex);
    formData.append('commandText', commandText);
    formData.append('audio', audioBlob, 'audio.webm');
    if (features) {
      formData.append('features', JSON.stringify(features));
    }
    const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/upload-audio', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Upload failed');
    }
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
