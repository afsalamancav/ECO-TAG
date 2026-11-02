import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://psmtolwulmqylsdezuis.supabase.co'; 

const supabaseAnonKey = 'sb_publishable_SkXgLiRWrxLZF1x5khQRlw_ttBnBxYc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});