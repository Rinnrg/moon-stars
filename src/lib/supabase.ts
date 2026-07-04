import { createClient } from '@supabase/supabase-js'

// Mencegah error 'WebSocket not supported' di Node.js < 22 karena Supabase otomatis mencoba
// melakukan inisialisasi modul Realtime (walaupun kita hanya memakai Storage API-nya saja).
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class {} as any
}

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const BUCKET = 'gallery'
