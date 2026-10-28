import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

// Definimos las alertas estáticas globales (Estándares de la industria textil y ambiental)
const REGLAS_GLOBALES = [
  {
    id: 'r1',
    icono: '💧',
    titulo: 'Alto consumo hídrico',
    descripcion: 'Se activa si una prenda contiene más de un 40% de fibras sintéticas (Poliéster, Microfibra, Acrílico). Estas telas requieren lavados a mayor temperatura y liberan microplásticos en el agua.',
    tipo: 'ambiental',
    activa: true,
  },
  {
    id: 'r2',
    icono: '🛑',
    titulo: 'Límite de vida útil (Reemplazo)',
    descripcion: 'Se activa cuando un textil supera los 200 ciclos de lavado. A partir de este punto, la tela pierde propiedades de absorción y suavidad, afectando la experiencia del huésped.',
    tipo: 'calidad',
    activa: true,
  },
  {
    id: 'r3',
    icono: '⏱️',
    titulo: 'Retraso Crítico en Lavandería',
    descripcion: 'Se activa si una prenda lleva más de 48 horas registrada como "Sucia" o "En lavandería" sin ser procesada. Ayuda a prevenir cuellos de botella operativos.',
    tipo: 'operativo',
    activa: true,
  },
  {
    id: 'r4',
    icono: '♻️',
    titulo: 'Fin de ciclo (Donación/Reciclaje)',
    descripcion: 'Se activa cuando una prenda llega a su límite de vida útil. Sugiere al administrador rutas de donación a fundaciones o reciclaje textil en lugar de desecharla en la basura común.',
    tipo: 'ambiental',
    activa: false, // Por defecto apagada, el hotel decide si activarla
  },
];

export default function GestionAlertas() {
  const router = useRouter();
  
  // Estado para controlar qué reglas están activas
  const [reglas, setReglas] = useState(REGLAS_GLOBALES);

  const toggleRegla = (id: string) => {
    setReglas(reglas.map(regla => 
      regla.id === id ? { ...regla, activa: !regla.activa } : regla
    ));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Alertas del Sistema</Text>
      <Text style={styles.subtitulo}>
        Estándares globales de sostenibilidad y calidad textil. Activa o desactiva las que mejor se adapten a las políticas de tu hotel.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ Estas reglas están predefinidas por normativas ambientales y de la industria. No se pueden borrar ni editar sus condiciones, pero tú decides qué alertas monitorear.
        </Text>
      </View>

      {/* Lista de Reglas Estáticas */}
      {reglas.map((regla) => (
        <View key={regla.id} style={[styles.card, !regla.activa && styles.cardInactiva]}>
          
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>{regla.icono}</Text>
              <Text style={styles.cardTitle}>{regla.titulo}</Text>
            </View>
            <Switch 
              value={regla.activa} 
              onValueChange={() => toggleRegla(regla.id)}
              trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
              thumbColor={regla.activa ? '#2E7D32' : '#FFF'}
            />
          </View>

          <Text style={styles.cardDescription}>{regla.descripcion}</Text>
          
          <View style={styles.tagRow}>
            <View style={[
              styles.tag, 
              regla.tipo === 'ambiental' ? styles.tagAmbiental : 
              regla.tipo === 'calidad' ? styles.tagCalidad : styles.tagOperativo
            ]}>
              <Text style={styles.tagText}>
                {regla.tipo.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.statusText}>
              {regla.activa ? 'Monitoreando' : 'Desactivada'}
            </Text>
          </View>

        </View>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  
  backButton: { marginBottom: 15 },
  backText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21', marginBottom: 5 },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },

  infoBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#1565C0' },
  infoText: { fontSize: 13, color: '#0D47A1', lineHeight: 18 },

  // Tarjetas de Reglas
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#E0E0E0' },
  cardInactiva: { opacity: 0.6, backgroundColor: '#FAFAFA' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  cardIcon: { fontSize: 24, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  
  cardDescription: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 15 },

  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagAmbiental: { backgroundColor: '#E8F5E9' },
  tagCalidad: { backgroundColor: '#FFEBEE' },
  tagOperativo: { backgroundColor: '#FFF3E0' },
  tagText: { fontSize: 10, fontWeight: 'bold', color: '#333', letterSpacing: 0.5 },
  
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#888' },
});