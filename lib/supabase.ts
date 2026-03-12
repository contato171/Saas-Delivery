import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://link-falso-para-vercel.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'chave_falsa_para_vercel'

export const supabase = createClient(supabaseUrl, supabaseKey)