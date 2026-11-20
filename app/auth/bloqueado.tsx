import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Bloqueado() {
  const router = useRouter();

  const volverAConfigurar = () => {
    // Lo devuelve a la pantalla donde se ingresa el código del hotel
    router.replace('/auth/configurar');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>⛔</Text>
        <Text style={styles.titulo}>Membresía Vencida</Text>
        
        <Text style={styles.subtitulo}>
          El acceso a EcoTag para este hotel ha sido suspendido porque la fecha de vencimiento ha expirado.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Por favor, contacta al administrador del sistema para renovar tu plan y reactivar todos los dispositivos del hotel.
          </Text>
        </View>

        <TouchableOpacity style={styles.boton} onPress={volverAConfigurar}>
          <Text style={styles.textoBoton}>Volver a Activación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#FFF', width: '100%', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  icon: { fontSize: 70, marginBottom: 15 },
  titulo: { fontSize: 26, fontWeight: '900', color: '#BF360C', marginBottom: 15, textAlign: 'center' },
  subtitulo: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  infoBox: { backgroundColor: '#FFF8E1', padding: 15, borderRadius: 10, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  infoText: { fontSize: 13, color: '#E65100', lineHeight: 18, textAlign: 'center' },
  boton: { backgroundColor: '#BF360C', padding: 18, borderRadius: 12, width: '100%', alignItems: 'center' },
  textoBoton: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});