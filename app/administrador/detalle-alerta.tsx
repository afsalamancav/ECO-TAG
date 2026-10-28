import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Base de datos simulada de prendas
const BASE_DATOS_PRENDAS = [
  { id: 'NFC-001', tipo: 'Sábana Queen', comp: '100% Poliéster', lavados: 45, estado: 'En Habitación 305', ubicacion: 'Hotel' },
  { id: 'NFC-002', tipo: 'Toalla de baño', comp: '100% Algodón', lavados: 195, estado: 'En Habitación 305', ubicacion: 'Hotel' },
  { id: 'NFC-003', tipo: 'Sábana King', comp: '50% Algodón / 50% Poliéster', lavados: 142, estado: 'En Lavandería', ubicacion: 'Lavandería' },
  { id: 'NFC-004', tipo: 'Funda de almohada', comp: '100% Microfibra', lavados: 210, estado: 'En Almacén', ubicacion: 'Almacén' },
  { id: 'NFC-005', tipo: 'Toalla de manos', comp: '100% Algodón', lavados: 20, estado: 'En Lavandería', ubicacion: 'Lavandería' },
  { id: 'NFC-006', tipo: 'Bata de baño', comp: '100% Tencel', lavados: 85, estado: 'En Habitación 402', ubicacion: 'Hotel' },
];

export default function DetalleAlerta() {
  const router = useRouter();
  const { tipo } = useLocalSearchParams(); 

  // 1. Configuramos qué mostrar según la alerta (r1, r2, r3)
  const getConfiguracionAlerta = () => {
    switch (tipo) {
      case 'r1': // Alto consumo hídrico
        return {
          titulo: 'Alto Consumo Hídrico',
          subtitulo: 'Prendas con alto porcentaje de fibras sintéticas. Requieren lavados a mayor temperatura.',
          icon: '💧',
          color: '#E3F2FD',
          borderColor: '#2196F3',
          prendas: BASE_DATOS_PRENDAS.filter(p => p.comp.includes('Poliéster') || p.comp.includes('Microfibra'))
        };
      case 'r2': // Límite de vida útil
        return {
          titulo: 'Límite de Vida Útil',
          subtitulo: 'Prendas que han superado los 200 lavados. Se recomienda retirarlas de circulación.',
          icon: '🛑',
          color: '#FFEBEE',
          borderColor: '#F44336',
          prendas: BASE_DATOS_PRENDAS.filter(p => p.lavados > 200)
        };
      case 'r3': // Retraso en Lavandería
        return {
          titulo: 'Retraso en Lavandería',
          subtitulo: 'Prendas que llevan mucho tiempo en el área de lavado sin ser procesadas.',
          icon: '⏱️',
          color: '#FFF3E0',
          borderColor: '#FF9800',
          prendas: BASE_DATOS_PRENDAS.filter(p => p.ubicacion === 'Lavandería')
        };
      default:
        return { titulo: 'Detalle', subtitulo: '', icon: '📋', color: '#F5F5F5', borderColor: '#999', prendas: [] };
    }
  };

  const info = getConfiguracionAlerta();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Panel</Text>
      </TouchableOpacity>

      {/* CABECERA DE LA ALERTA */}
      <View style={[styles.headerCard, { backgroundColor: info.color, borderLeftColor: info.borderColor }]}>
        <Text style={styles.headerIcon}>{info.icon}</Text>
        <Text style={styles.headerTitle}>{info.titulo}</Text>
        <Text style={styles.headerDesc}>{info.subtitulo}</Text>
      </View>

      {/* LISTA DE PRENDAS AFECTADAS */}
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Prendas Afectadas</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{info.prendas.length} encontradas</Text>
        </View>
      </View>

      {info.prendas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>¡Todo en orden! Ninguna prenda cumple con la condición de esta alerta.</Text>
        </View>
      ) : (
        info.prendas.map((prenda) => (
          <View key={prenda.id} style={styles.prendaCard}>
            <View style={styles.prendaHeader}>
              <Text style={styles.prendaId}>{prenda.id}</Text>
              <View style={styles.locationBadge}>
                <Text style={styles.locationText}>{prenda.estado}</Text>
              </View>
            </View>
            
            <Text style={styles.prendaName}>{prenda.tipo}</Text>
            
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Composición:</Text>
              <Text style={styles.detailValue}>{prenda.comp}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Lavados:</Text>
              <Text style={[styles.detailValue, prenda.lavados > 200 && { color: '#F44336', fontWeight: 'bold' }]}>
                {prenda.lavados} ciclos
              </Text>
            </View>

            {/* BOTÓN DE HISTORIAL CONECTADO */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push({ pathname: '/administrador/historial', params: { id: prenda.id } })}
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

  // Header de la alerta
  headerCard: { padding: 20, borderRadius: 12, marginBottom: 25, borderLeftWidth: 6 },
  headerIcon: { fontSize: 32, marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  headerDesc: { fontSize: 14, color: '#444', lineHeight: 20 },

  // Título de sección y contador
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  countBadge: { backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: 'bold', color: '#555' },

  // Tarjetas de prendas
  prendaCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', shadowColor: '#000', shadowOpacity: 0.03, elevation: 2 },
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

  // Estado vacío
  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 20 },
});