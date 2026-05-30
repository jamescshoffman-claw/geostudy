import { createClient } from '@supabase/supabase-js'

// These are public, client-side values (the "publishable" key is designed to be
// exposed in the browser). Safe to commit and bundle into the static site.
const SUPABASE_URL = 'https://sofrzvspjrvtovksjdvi.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Zh07DXhCr6jAcy1ZDAiviQ_XPFjings'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
