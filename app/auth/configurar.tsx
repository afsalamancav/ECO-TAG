import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../conexion/supabase';
import { guardarSesion } from '../../conexion/sesion';

export default function ConfigurarHotel() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);

  const activarApp = async () => {
    if (!codigo.trim()) return Alert.alert("Error", "Ingresa el ID del hotel.");
    
    setCargando(true);
    // Buscamos el hotel por su ID en la base de datos
    const { data, error } = await supabase
      .from('hoteles')
      .select('*')
      .eq('id', codigo.trim())
      .single();

    if (error || !data) {
      Alert.alert("Código Inválido", "No encontramos ningún hotel con ese ID. Verifícalo.");
    } else {
      // Guardamos el ID del hotel en la caché del celular
      await guardarSesion(data.id, data.nombre);
      Alert.alert("¡Bienvenido!", `App activada para: ${data.nombre}`);
      router.replace('/'); 
    }
    setCargando(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🌿</Text>
      <Text style={styles.titulo}>Activar EcoTag</Text>
      <Text style={styles.subtitulo}>
        Ingresa el ID de tu hotel para habilitar la aplicación en este dispositivo.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>ID del Hotel</Text>
        <TextInput 
          style={styles.input}
          placeholder="Ej: fa74575e-dde3-..."
          placeholderTextColor="#999"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="none"
        />
        
        <TouchableOpacity style={styles.boton} onPress={activarApp} disabled={cargando}>
          {cargando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.textoBoton}>Habilitar App</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4', justifyContent: 'center', padding: 25 },
  logo: { fontSize: 60, textAlign: 'center', marginBottom: 20 },
  titulo: { fontSize: 32, fontWeight: '900', color: '#1B4D21', textAlign: 'center', marginBottom: 10 },
  subtitulo: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, fontSize: 16, color: '#333', marginBottom: 20 },
  boton: { backgroundColor: '#1B4D21', padding: 18, borderRadius: 12, alignItems: 'center' },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});