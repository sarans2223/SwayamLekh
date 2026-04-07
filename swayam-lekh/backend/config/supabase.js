// Supabase backend client setup
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY; // Prefer service key, fallback to publishable if missing

if (!SUPABASE_URL) {
	throw new Error('SUPABASE_URL is required');
}
if (!SUPABASE_SERVICE_KEY) {
	throw new Error('SUPABASE_SERVICE_KEY is required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = supabase;
