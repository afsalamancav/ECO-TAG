import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../conexion/supabase';
import { obtenerIdHotel } from '../../conexion/sesion'; // <-- IMPORTANTE

export default function DetalleAlerta() {
  const router = useRouter();
  const { tipo } = useLocalSearchParams(); 

  const [prendasAfectadas, setPrendasAfectadas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const getConfiguracionAlerta = () => {
    switch (tipo) {
      case 'r1':
        return { titulo: 'Alto Consumo Hídrico', subtitulo: 'Prendas con alto porcentaje de fibras sintéticas.', icon: '💧', color: '#E3F2FD', borderColor: '#2196F3' };
      case 'r2':
        return { titulo: 'Límite de Vida Útil', subtitulo: 'Prendas que han superado los 200 lavados.', icon: '🛑', color: '#FFEBEE', borderColor: '#F44336' };
      case 'r3':
        return { titulo: 'Retraso en Lavandería', subtitulo: 'Prendas con demasiado tiempo en el área de lavado.', icon: '⏱️', color: '#FFF3E0', borderColor: '#FF9800' };
      default:
        return { titulo: 'Detalle', subtitulo: '', icon: '📋', color: '#F5F5F5', borderColor: '#999' };
    }
  };

  const info = getConfiguracionAlerta();

  useEffect(() => {
    cargarPrendasAfectadas();
  }, [tipo]);

  const cargarPrendasAfectadas = async () => {
    setCargando(true);
    const idHotel = await obtenerIdHotel(); // <-- Obtenemos el ID del hotel

    if (!idHotel) {
      setCargando(false);
      return;
    }

    // Consulta BASE filtrada por el hotel actual
    let query = supabase.from('articulos').select('*').eq('id_hotel', idHotel);

    if (tipo === 'r1') {
      query = query.not('id_tipo_tela', 'is', null);
    } else if (tipo === 'r2') {
      query = query.or('lavados_totales.gte.200,estado.eq.Perdida');
    } else if (tipo === 'r3') {
      query = query.eq('estado', 'Lavandería');
    }

    const { data, error } = await query;
    
    if (!error && data) {
      setPrendasAfectadas(data);
    }
    setCargando(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <View style={[styles.headerCard, { backgroundColor: info.color, borderLeftColor: info.borderColor }]}>
        <Text style={styles.headerIcon}>{info.icon}</Text>
        <Text style={styles.headerTitle}>{info.titulo}</Text>
        <Text style={styles.headerDesc}>{info.subtitulo}</Text>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Prendas Afectadas</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{prendasAfectadas.length} encontradas</Text>
        </View>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#1B4D21" style={{ marginTop: 20 }} />
      ) : prendasAfectadas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>¡Todo en orden! Ninguna prenda de tu hotel cumple con esta condición.</Text>
        </View>
      ) : (
        prendasAfectadas.map((prenda) => (
          <View key={prenda.id} style={styles.prendaCard}>
            <View style={styles.prendaHeader}>
              <Text style={styles.prendaId}>{prenda.nfc_uid}</Text>
              <View style={styles.locationBadge}>
                <Text style={styles.locationText}>{prenda.estado}</Text>
              </View>
            </View>
            
            <Text style={styles.prendaName}>{prenda.tipo_prenda}</Text>
            
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Lavados:</Text>
              <Text style={[styles.detailValue, prenda.lavados_totales > 200 && { color: '#F44336', fontWeight: 'bold' }]}>
                {prenda.lavados_totales} ciclos
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push({ pathname: '/administrador/historial', params: { id: prenda.nfc_uid } })}
            >
              <Text style={styles.actionText}>Ver historial de la prenda →</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },

  headerCard: { padding: 20, borderRadius: 12, marginBottom: 25, borderLeftWidth: 6 },
  headerIcon: { fontSize: 32, marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  headerDesc: { fontSize: 14, color: '#444', lineHeight: 20 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  countBadge: { backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: 'bold', color: '#555' },

  prendaCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', elevation: 2 },
  prendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prendaId: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  locationBadge: { backgroundColor: '#F0F4F8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  locationText: { fontSize: 11, fontWeight: 'bold', color: '#1565C0' },
  
  prendaName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  
  detailsRow: { flexDirection: 'row', marginBottom: 4 },
  detailLabel: { fontSize: 13, color: '#666', width: 100 },
  detailValue: { fontSize: 13, color: '#333', fontWeight: '500', flex: 1 },

  actionButton: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, marginTop: 12, alignItems: 'center' },
  actionText: { color: '#1565C0', fontWeight: 'bold', fontSize: 13 },

  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 20 },
});