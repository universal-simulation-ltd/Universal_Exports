import { createClient } from '@supabase/supabase-js'

// The platform-prefixed vars are canonical (they also feed the @unisim/sdk
// UniversalProvider in main.tsx). Fall back to the legacy unprefixed names so
// self-hosters with older .env files keep working. Reading the wrong name here
// produces createClient(undefined, …) which throws "supabaseUrl is required."
// at module load — crashing the whole app to a blank screen before React mounts.
const supabaseUrl = (import.meta.env.VITE_PLATFORM_SUPABASE_URL ??
  import.meta.env.VITE_SUPABASE_URL) as string
const supabaseAnonKey = (import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
