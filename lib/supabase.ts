import { createClient } from '@supabase/supabase-js'

// Puxando as chaves que guardamos no arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Criando e exportando a conexão pronta para ser usada no resto do site
export const supabase = createClient(supabaseUrl, supabaseKey)