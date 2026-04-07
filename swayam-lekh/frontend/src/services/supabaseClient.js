import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

const isMock = supabaseUrl.includes('placeholder');

// ─── Photo upload ─────────────────────────────────────────────────────────────
export const uploadPhoto = async (regNo, name, dataUrl) => {
  if (isMock) { console.warn('[MOCK] Photo upload skipped'); return true; }
  try {
    const response = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regNo, name, dataUrl }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Photo upload failed with status ${response.status}`);
    }

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
  // [TEMPORARY DISABLE] User requested to hold off on uploading voice to DB for now
  console.warn('[MOCK] Voice upload disabled for now.'); 
  return true; 
  /*
  if (isMock) { console.warn('[MOCK] Voice upload skipped'); return true; }
  try {
    const fileName = `${regNo}/cmd_${commandIndex}_${Date.now()}.webm`;

    // 1️⃣ Upload audio to Supabase Storage
    const { data: up, error: upErr } = await supabase.storage
      .from('voice-profiles')
      .upload(fileName, audioBlob, { contentType: 'audio/webm', upsert: true });

    if (upErr) throw upErr;

    // 2️⃣ Insert record into the database table for future reference/malpractice check
    const { error: dbErr } = await supabase.from('voice_profiles').insert([{
      register_no:   regNo,
      student_name:  name,
      command_index: commandIndex,
      command_text:  commandText,
      audio_path:    up.path,
      features_json: features ? JSON.stringify(features) : null,
      created_at:    new Date().toISOString(),
    }]);

    if (dbErr) throw dbErr;

    return true;
  } catch (err) {
    console.error('saveVoiceProfile error:', err);
    return false;
  }
  */
};

/**
 * Fetch all stored voice profiles for a student.
 * Returns array of rows with mfcc_features etc.
 */
export const getVoiceProfiles = async (regNo) => {
  // [TEMPORARY DISABLE] 
  console.warn('[MOCK] getVoiceProfiles disabled for now — returning empty');
  return [];
  /*
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
    return [];
  }
  */
};

/**
 * Log a malpractice event to the malpractice_logs table.
 */
export const logMalpractice = async (regNo, name, similarityScore, failedParams = '') => {
  // [TEMPORARY DISABLE]
  console.warn('[MOCK] logMalpractice disabled for now');
  return true;
  /*
  if (isMock) {
    console.warn('[MOCK] logMalpractice skipped');
    return true;
  }
  try {
    const { error } = await supabase.from('malpractice_logs').insert([{
      register_no:       regNo,
      student_name:      name,
      detected_at:       new Date().toISOString(),
      similarity_score:  similarityScore,
      failed_parameters: failedParams,
      action_taken:      'alarm_triggered',
    }]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('logMalpractice error:', err);
    return false;
  }
  */
};

// ─── Legacy wrappers (InstructionsPage compatibility) ────────────────────────
export const uploadVoiceCommand    = saveVoiceProfile;
export const uploadVoiceVerification = saveVoiceProfile;
