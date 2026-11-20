import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../conexion/supabase';
import { obtenerIdHotel } from '../../conexion/sesion';

export default function LoginAdmin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async () => {
    if (!email.trim() || !password) {
      return Alert.alert("Campos vacíos", "Por favor ingresa tu correo y contraseña.");
    }

    setCargando(true);

    try {
      // 1. Autenticamos al usuario
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError || !authData.user) {
        Alert.alert("Credenciales inválidas", "El correo o la contraseña son incorrectos.");
        setCargando(false);
        return;
      }

      // 2. Obtenemos el ID del hotel de la caché del celular
      const idHotel = await obtenerIdHotel();
      if (!idHotel) {
        Alert.alert("Error", "Este dispositivo no tiene un hotel activado.");
        setCargando(false);
        return;
      }

      // 3. Verificamos si el hotel ya tiene un administrador asignado
      const { data: hotel, error: hotelError } = await supabase
        .from('hoteles')
        .select('id, nombre, id_admin')
        .eq('id', idHotel)
        .single();

      if (hotelError || !hotel) {
        Alert.alert("Error", "No se encontró el hotel.");
        setCargando(false);
        return;
      }

      // 4. LÓGICA DE VINCULACIÓN AUTOMÁTICA
      if (!hotel.id_admin) {
        // Si el hotel no tiene admin, vinculamos al usuario actual
        console.log("Vinculando administrador al hotel...");
        await supabase
          .from('hoteles')
          .update({ id_admin: authData.user.id })
          .eq('id', idHotel);
      } else if (hotel.id_admin !== authData.user.id) {
        // Si el hotel ya tiene un admin diferente, rechazamos el acceso
        Alert.alert("Acceso Denegado", "Este usuario no es el administrador de este hotel.");
        await supabase.auth.signOut();
        setCargando(false);
        return;
      }

      // 5. Si todo está bien, entra al Dashboard
      router.replace('/administrador/dashboard');

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un error inesperado.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🔐</Text>
      <Text style={styles.titulo}>Acceso Administrador</Text>
      <Text style={styles.subtitulo}>Ingresa tus credenciales para gestionar el hotel.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput style={styles.input} placeholder="admin@hotel.com" placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />
        
        <TouchableOpacity style={styles.boton} onPress={iniciarSesion} disabled={cargando}>
          {cargando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.textoBoton}>Iniciar Sesión</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4', justifyContent: 'center', padding: 25 },
  logo: { fontSize: 60, textAlign: 'center', marginBottom: 20 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21', textAlign: 'center', marginBottom: 5 },
  subtitulo: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, fontSize: 16, color: '#333', marginBottom: 15 },
  boton: { backgroundColor: '#1B4D21', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});