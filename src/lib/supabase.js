import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars.',
    'VITE_SUPABASE_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING',
    'VITE_SUPABASE_SUPABASE_PUBLISHABLE_KEY:', supabaseAnonKey ? 'set' : 'MISSING'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
