import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';

// Base de datos simulada con más estados
const BASE_DATOS = {
  'NFC-001': {
    id: 'NFC-001', tipo: 'Sábana Queen', composicion: '100% Poliéster', estadoActual: 'En Habitación 305',
    fechaIngreso: '12/01/2025', lavadosTotales: 45, vidaUtilMax: 200,
    eventos: [
      { fecha: '15/10/2026', evento: 'Asignada a Habitación 305', detalle: 'Reemplazo de rutina.' },
      { fecha: '10/10/2026', evento: 'Lavado #45 completado', detalle: 'Ciclo de 60°C.' },
    ]
  },
  'NFC-003': {
    id: 'NFC-003', tipo: 'Sábana King', composicion: '50% Algodón / 50% Poliéster', estadoActual: 'En Lavandería',
    fechaIngreso: '12/01/2025', lavadosTotales: 142, vidaUtilMax: 200,
    eventos: [
      { fecha: '16/10/2026', evento: 'Ingreso a Lavandería', detalle: 'Reportada como sucia por el personal de hotel.' },
      { fecha: '15/10/2026', evento: 'Lavado #142 completado', detalle: 'Ciclo de 60°C con secado industrial.' },
      { fecha: '12/10/2026', evento: 'Alerta de desgaste leve', detalle: 'El sistema detectó pérdida de color.' },
    ]
  },
  'NFC-004': {
    id: 'NFC-004', tipo: 'Funda de almohada', composicion: '100% Microfibra', estadoActual: 'En Almacén',
    fechaIngreso: '05/02/2024', lavadosTotales: 210, vidaUtilMax: 200,
    eventos: [
      { fecha: '01/10/2026', evento: 'Prenda retirada a almacén', detalle: 'Superó el límite de lavados.' },
    ]
  }
};

export default function HistorialPrenda() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 

  const [searchId, setSearchId] = useState('');
  const [prenda, setPrenda] = useState<any>(null);
  
  // Estado para el modal de baja y de cambio de estado
  const [modalBajaVisible, setModalBajaVisible] = useState(false);
  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      const idLimpio = id.trim().toUpperCase();
      setSearchId(idLimpio);
      if (BASE_DATOS[idLimpio as keyof typeof BASE_DATOS]) {
        setPrenda(BASE_DATOS[idLimpio as keyof typeof BASE_DATOS]);
      }
    }
  }, [id]);

  const buscarPrenda = () => {
    const idLimpio = searchId.trim().toUpperCase();
    if (BASE_DATOS[idLimpio as keyof typeof BASE_DATOS]) {
      setPrenda(BASE_DATOS[idLimpio as keyof typeof BASE_DATOS]);
    } else {
      Alert.alert("No encontrada", "No hay datos para este ID. Prueba con NFC-001, NFC-003 o NFC-004.");
      setPrenda(null);
    }
  };

  const simularEscaneoNFC = () => {
    Alert.alert("📡 Leyendo chip NFC...", "Acerca el dispositivo a la etiqueta del textil.", [
      { text: "Simular lectura (NFC-003)", onPress: () => { setSearchId('NFC-003'); setPrenda(BASE_DATOS['NFC-003']); } },
      { text: "Cancelar", style: "cancel" }
    ]);
  };

  const simularLavado = () => {
    if (!prenda) return;
    const nuevosLavados = prenda.lavadosTotales + 1;
    const nuevosEventos = [{
      fecha: new Date().toLocaleDateString('es-CO'), 
      evento: `Lavado #${nuevosLavados} completado`, 
      detalle: 'Escaneo de egreso de lavandería.'
    }, ...prenda.eventos];

    setPrenda({ ...prenda, lavadosTotales: nuevosLavados, estadoActual: 'En uso', eventos: nuevosEventos });

    if (nuevosLavados >= prenda.vidaUtilMax) {
      Alert.alert("Alerta Crítica", "Esta prenda ha alcanzado su límite de vida útil. Debe ser retirada.");
    }
  };

  // --- CAMBIO MANUAL DE ESTADO ---
  const cambiarEstado = (nuevoEstado: string) => {
    if (!prenda) return;
    
    const nuevoEvento = {
      fecha: new Date().toLocaleDateString('es-CO'),
      evento: 'Cambio manual de estado',
      detalle: `El administrador cambió el estado a: ${nuevoEstado}`
    };

    setPrenda({ 
      ...prenda, 
      estadoActual: nuevoEstado,
      eventos: [nuevoEvento, ...prenda.eventos]
    });
    
    setModalEstadoVisible(false);
    Alert.alert("Estado Actualizado", `La prenda ahora está: ${nuevoEstado}`);
  };

  const confirmarBaja = () => {
    setModalBajaVisible(false);
    Alert.alert("Prenda dada de baja", `La prenda ${prenda.id} ha sido eliminada del inventario.`);
    setPrenda(null);
    setSearchId('');
  };

  const porcentajeVida = prenda ? (prenda.lavadosTotales / prenda.vidaUtilMax) * 100 : 0;
  let colorBarra = '#4CAF50'; 
  if (porcentajeVida > 50) colorBarra = '#FF9800'; 
  if (porcentajeVida > 80) colorBarra = '#F44336'; 

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL CAMBIAR ESTADO */}
      <Modal visible={modalEstadoVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambiar Estado</Text>
            <Text style={styles.modalSub}>Selecciona el nuevo estado para <Text style={{fontWeight: 'bold'}}>{prenda?.tipo}</Text>.</Text>
            
            <TouchableOpacity style={styles.stateOption} onPress={() => cambiarEstado('En Almacén')}>
              <Text style={styles.stateIcon}>📦</Text>
              <Text style={styles.stateText}>En Almacén (Disponible)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stateOption} onPress={() => cambiarEstado('En Lavandería')}>
              <Text style={styles.stateIcon}>🧺</Text>
              <Text style={styles.stateText}>En Lavandería (Sucio)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stateOption} onPress={() => cambiarEstado('En Habitación')}>
              <Text style={styles.stateIcon}>🚪</Text>
              <Text style={styles.stateText}>En Habitación (En uso)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.stateOption, { borderColor: '#F44336', borderWidth: 1 }]} onPress={() => cambiarEstado('Perdida')}>
              <Text style={styles.stateIcon}>❓</Text>
              <Text style={[styles.stateText, { color: '#F44336' }]}>Reportada como Perdida</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalEstadoVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DAR DE BAJA */}
      <Modal visible={modalBajaVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteIcon}>⚠️</Text>
            <Text style={styles.deleteTitle}>Dar de baja prenda</Text>
            <Text style={styles.deleteMessage}>
              ¿Estás seguro de que deseas eliminar del sistema la prenda <Text style={{fontWeight: 'bold'}}>{prenda?.tipo} ({prenda?.id})</Text>? 
              Esta acción es irreversible.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setModalBajaVisible(false)}><Text style={styles.deleteCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmarBaja}><Text style={styles.deleteConfirmText}>Sí, dar de baja</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Hoja de Vida Textil</Text>
      <Text style={styles.subtitulo}>Escanea el NFC o busca por ID para ver el historial.</Text>

      <TouchableOpacity style={styles.scanButton} onPress={simularEscaneoNFC}>
        <Text style={styles.scanIcon}>📡</Text>
        <Text style={styles.scanText}>Escanear Etiqueta NFC</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>O BUSCAR MANUALMENTE</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} value={searchId} onChangeText={setSearchId} placeholder="ID NFC (ej. NFC-003)" autoCapitalize="characters" />
        <TouchableOpacity style={styles.searchButton} onPress={buscarPrenda}><Text style={styles.searchButtonText}>Buscar</Text></TouchableOpacity>
      </View>

      {prenda && (
        <View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.prendaId}>{prenda.id}</Text>
              <TouchableOpacity 
                style={[
                  styles.badge, 
                  prenda.estadoActual.includes('Lavandería') ? styles.badgeWarning : 
                  prenda.estadoActual.includes('Perdida') ? styles.badgeDanger : styles.badgeOk
                ]}
                onPress={() => setModalEstadoVisible(true)}
              >
                <Text style={styles.badgeText}>{prenda.estadoActual} ✎</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.prendaNombre}>{prenda.tipo}</Text>
            <Text style={styles.prendaComp}>🧵 {prenda.composicion}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de ingreso:</Text>
              <Text style={styles.infoValue}>{prenda.fechaIngreso}</Text>
            </View>

            <View style={styles.lifeBarContainer}>
              <View style={styles.lifeBarTextRow}>
                <Text style={styles.lifeBarLabel}>Vida útil (Lavados)</Text>
                <Text style={[styles.lifeBarValue, { color: colorBarra }]}>{prenda.lavadosTotales} / {prenda.vidaUtilMax}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${porcentajeVida}%`, backgroundColor: colorBarra }]} />
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.simulateButton} onPress={simularLavado}>
              <Text style={styles.simulateText}>📡 Simular Lavado (+1)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setModalBajaVisible(true)}>
              <Text style={styles.deleteBtnText}>🗑️ Dar de baja</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Registro de Eventos</Text>
          {prenda.eventos.map((evento: any, index: number) => (
            <View key={index} style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: colorBarra }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{evento.fecha}</Text>
                <Text style={styles.timelineTitle}>{evento.evento}</Text>
                <Text style={styles.timelineDetail}>{evento.detalle}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {!prenda && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👕</Text>
          <Text style={styles.emptyText}>Escanea una prenda o busca su ID para ver su historial completo.</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21', marginBottom: 5 },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 20 },

  scanButton: { backgroundColor: '#1565C0', flexDirection: 'row', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#1565C0', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginBottom: 20 },
  scanIcon: { fontSize: 24, marginRight: 10 },
  scanText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DDD' },
  dividerText: { marginHorizontal: 10, color: '#999', fontSize: 12, fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', marginBottom: 25 },
  searchInput: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, marginRight: 10 },
  searchButton: { backgroundColor: '#2E7D32', padding: 12, borderRadius: 8, justifyContent: 'center' },
  searchButtonText: { color: '#FFF', fontWeight: 'bold' },

  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  prendaId: { fontSize: 14, fontWeight: 'bold', color: '#888' },
  prendaNombre: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  prendaComp: { fontSize: 14, color: '#666', marginBottom: 15 },
  
  // Badge interactivo (parece botón)
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeOk: { backgroundColor: '#E8F5E9' },
  badgeWarning: { backgroundColor: '#FFF3E0' },
  badgeDanger: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#333' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },

  lifeBarContainer: { marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
  lifeBarTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lifeBarLabel: { fontSize: 13, fontWeight: 'bold', color: '#555' },
  lifeBarValue: { fontSize: 14, fontWeight: '900' },
  progressBarBg: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  simulateButton: { flex: 1, backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#BBDEFB' },
  simulateText: { color: '#1565C0', fontWeight: 'bold', fontSize: 13 },
  deleteBtn: { flex: 1, backgroundColor: '#FFEBEE', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' },
  deleteBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 13 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 15 },
  timelineContent: { flex: 1, borderLeftWidth: 2, borderLeftColor: '#E0E0E0', paddingLeft: 15, marginLeft: -21 },
  timelineDate: { fontSize: 12, color: '#888', fontWeight: 'bold', marginBottom: 2 },
  timelineTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  timelineDetail: { fontSize: 13, color: '#666' },

  emptyState: { alignItems: 'center', marginTop: 40, padding: 20 },
  emptyIcon: { fontSize: 60, marginBottom: 15, opacity: 0.5 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 16, lineHeight: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  deleteModalBox: { backgroundColor: '#FFF', width: '85%', padding: 25, borderRadius: 16, alignItems: 'center', elevation: 5 },
  deleteIcon: { fontSize: 40, marginBottom: 15 },
  deleteTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  deleteMessage: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  deleteActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  deleteCancelBtn: { flex: 1, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  deleteCancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  deleteConfirmBtn: { flex: 1, padding: 15, backgroundColor: '#D32F2F', borderRadius: 10, alignItems: 'center' },
  deleteConfirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Estilos del Modal de Estado
  modalBox: { backgroundColor: '#FFF', width: '90%', padding: 25, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  stateOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  stateIcon: { fontSize: 24, marginRight: 15 },
  stateText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cancelButton: { padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginTop: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
});