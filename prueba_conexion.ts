import { createClient } from '@supabase/supabase-js';

// 1. AQUÍ DEBE IR LA URL REAL (sin el /rest/v1/)
const supabaseUrl = 'https://psmtolwulmqylsdezuis.supabase.co';
const supabaseKey = 'sb_publishable_SkXgLiRWrxLZF1x5khQRlw_ttBnBxYc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probar() {
  console.log("Iniciando prueba de conexión...");
  
  const { data, error } = await supabase.from('articulos').select('*').limit(1);

  if (error) {
    console.error("❌ Error de conexión:", error.message);
  } else {
    console.log("✅ ¡Conexión exitosa!");
    console.log("Datos recibidos:", data);
  }
}

probar();