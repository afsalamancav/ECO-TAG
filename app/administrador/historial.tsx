import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../conexion/supabase';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function HistorialPrenda() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 

  // Estados de la pantalla
  const [prendas, setPrendas] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cargando, setCargando] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Estados de la prenda seleccionada
  const [prendaSeleccionada, setPrendaSeleccionada] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  
  // Estados de los Modales
  const [modalDetallesVisible, setModalDetallesVisible] = useState(false);
  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);

  useEffect(() => {
    cargarPrendas();
    if (id && typeof id === 'string') {
      buscarYSeleccionar(id);
    }
  }, [id]);

  const cargarPrendas = async () => {
    setCargando(true);
    const { data } = await supabase.from('articulos').select('*').order('created_at', { ascending: false });
    setPrendas(data || []);
    setCargando(false);
  };

  const buscarYSeleccionar = async (uid: string) => {
    setCargandoDetalles(true);
    const { data: prendaData, error } = await supabase
      .from('articulos')
      .select('*')
      .eq('nfc_uid', uid.toUpperCase())
      .single();

    if (error || !prendaData) {
      Alert.alert("No encontrada", "No hay datos para este ID NFC.");
      setCargandoDetalles(false);
      return;
    }

    setPrendaSeleccionada(prendaData);
    
    const { data: historialData } = await supabase
      .from('historial')
      .select('*')
      .eq('id_articulo', prendaData.id)
      .order('fecha', { ascending: false });

    setEventos(historialData || []);
    setCargandoDetalles(false);
    setModalDetallesVisible(true);
  };

  const escanearNFC = async () => {
    setIsScanning(true);
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (tag && tag.id) {
        buscarYSeleccionar(tag.id);
      }
    } catch (ex) {
      Alert.alert("Error", "No se pudo leer el NFC.");
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      setIsScanning(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!prendaSeleccionada) return;

    // Si eligen Lavandería, guardamos En Tránsito para el flujo logístico
    const estadoFinal = nuevoEstado === 'Lavandería' ? 'En Tránsito' : nuevoEstado;

    const { error } = await supabase.from('articulos').update({ estado: estadoFinal }).eq('id', prendaSeleccionada.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Si pasa a Disponible, En Tránsito o Perdida, liberamos la habitación
      if (estadoFinal === 'Disponible' || estadoFinal === 'En Tránsito' || estadoFinal === 'Perdida') {
        await supabase.from('asignaciones')
          .update({ activa: false, fecha_liberacion: new Date().toISOString() })
          .eq('id_articulo', prendaSeleccionada.id)
          .eq('activa', true);
      }

      // Guardamos en el historial
      await supabase.from('historial').insert([
        { id_articulo: prendaSeleccionada.id, evento: 'Cambio manual de estado', detalle: `El administrador cambió el estado a: ${estadoFinal}` }
      ]);
      
      setModalEstadoVisible(false);
      setModalDetallesVisible(false);
      buscarYSeleccionar(prendaSeleccionada.nfc_uid); 
      cargarPrendas();
    }
  };

  const prendasFiltradas = prendas.filter(p => 
    p.tipo_prenda.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.nfc_uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      
      {/* MODAL DE ESCANEANDO */}
      <Modal visible={isScanning} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color="#1B4D21" />
            <Text style={styles.scanningTitle}>Escaneando Chip NFC...</Text>
            <Text style={styles.scanningText}>Acerca el chip a la parte trasera del celular.</Text>
            <TouchableOpacity 
              style={styles.cancelScanBtn} 
              onPress={() => { 
                NfcManager.cancelTechnologyRequest(); 
                setIsScanning(false); 
              }}
            >
              <Text style={styles.cancelScanText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE DETALLES Y HISTORIAL */}
      <Modal visible={modalDetallesVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalDetallesBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del Textil</Text>
              <TouchableOpacity onPress={() => setModalDetallesVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {cargandoDetalles ? (
              <ActivityIndicator size="large" color="#1B4D21" style={{ marginTop: 50 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.prendaId}>{prendaSeleccionada?.nfc_uid}</Text>
                    <TouchableOpacity 
                      style={[styles.badge, prendaSeleccionada?.estado === 'Lavandería' || prendaSeleccionada?.estado === 'En Tránsito' ? styles.badgeWarning : prendaSeleccionada?.estado === 'Perdida' ? styles.badgeDanger : styles.badgeOk]}
                      onPress={() => setModalEstadoVisible(true)}
                    >
                      <Text style={styles.badgeText}>{prendaSeleccionada?.estado} ✎</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.prendaNombre}>{prendaSeleccionada?.tipo_prenda}</Text>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ciclos de lavado:</Text>
                    <Text style={styles.infoValue}>{prendaSeleccionada?.lavados_totales} / {prendaSeleccionada?.vida_util_max}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(prendaSeleccionada?.lavados_totales / prendaSeleccionada?.vida_util_max) * 100}%`, backgroundColor: prendaSeleccionada?.lavados_totales > 150 ? '#F44336' : '#FF9800' }]} />
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Historial de Eventos ({eventos.length})</Text>
                {eventos.length === 0 ? (
                  <Text style={styles.emptyText}>No hay eventos registrados.</Text>
                ) : (
                  eventos.map((evento) => (
                    <View key={evento.id} style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineDate}>{new Date(evento.fecha).toLocaleDateString('es-CO')} - {new Date(evento.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Text>
                        <Text style={styles.timelineTitle}>{evento.evento}</Text>
                        <Text style={styles.timelineDetail}>{evento.detalle}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL PARA CAMBIAR EL ESTADO */}
      <Modal visible={modalEstadoVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cambiar Estado</Text>
            
            <TouchableOpacity style={styles.stateOption} onPress={() => cambiarEstado('Disponible')}>
              <Text style={styles.stateIcon}>📦</Text>
              <Text style={styles.stateText}>Disponible (En Almacén)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stateOption} onPress={() => cambiarEstado('Lavandería')}>
              <Text style={styles.stateIcon}>🧺</Text>
              <Text style={styles.stateText}>Enviar a Lavandería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.stateOption, { borderColor: '#F44336', borderWidth: 1 }]} onPress={() => cambiarEstado('Perdida')}>
              <Text style={styles.stateIcon}>❓</Text>
              <Text style={[styles.stateText, { color: '#F44336' }]}>Reportar como Perdida</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalEstadoVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* INTERFAZ PRINCIPAL */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Historial y Trazabilidad</Text>
        
        <TouchableOpacity style={styles.scanButton} onPress={escanearNFC} disabled={isScanning}>
          <Text style={styles.scanIcon}>📡</Text>
          <Text style={styles.scanText}>Escanear NFC para ver Detalles</Text>
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar por nombre o NFC UID..." 
            placeholderTextColor="#999" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
        </View>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#1B4D21" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={prendasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.prendaCard} onPress={() => buscarYSeleccionar(item.nfc_uid)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardNfc}>{item.nfc_uid}</Text>
                <Text style={styles.cardNombre}>{item.tipo_prenda}</Text>
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusBadge, item.estado === 'Lavandería' || item.estado === 'En Tránsito' ? styles.badgeWarning : item.estado === 'Perdida' ? styles.badgeDanger : styles.badgeOk]}>
                  <Text style={styles.badgeText}>{item.estado}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron prendas con ese criterio.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  header: { padding: 20, paddingTop: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21', marginBottom: 20 },

  scanButton: { backgroundColor: '#1565C0', flexDirection: 'row', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  scanIcon: { fontSize: 20, marginRight: 10 },
  scanText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  searchContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15, alignItems: 'center' },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  prendaCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#EEE' },
  cardLeft: { flex: 1 },
  cardNfc: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 4 },
  cardNombre: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardRight: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, marginRight: 10 },
  badgeOk: { backgroundColor: '#E8F5E9' },
  badgeWarning: { backgroundColor: '#FFF3E0' },
  badgeDanger: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  arrow: { fontSize: 24, color: '#CCC', fontWeight: 'bold' },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  
  scanningBox: { backgroundColor: '#FFF', width: '85%', padding: 30, borderRadius: 20, alignItems: 'center' },
  scanningTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B4D21', marginTop: 20, marginBottom: 10 },
  scanningText: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 25 },
  cancelScanBtn: { padding: 15, backgroundColor: '#FFEBEE', borderRadius: 10, width: '100%', alignItems: 'center' },
  cancelScanText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },

  modalDetallesBox: { backgroundColor: '#FFF', width: '90%', height: '80%', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  closeIcon: { fontSize: 22, color: '#999', padding: 5 },

  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#EEE' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  prendaId: { fontSize: 14, fontWeight: 'bold', color: '#888' },
  prendaNombre: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  progressBarBg: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 15 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 15, backgroundColor: '#2E7D32' },
  timelineContent: { flex: 1, borderLeftWidth: 2, borderLeftColor: '#E0E0E0', paddingLeft: 15, marginLeft: -21 },
  timelineDate: { fontSize: 12, color: '#888', fontWeight: 'bold', marginBottom: 2 },
  timelineTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  timelineDetail: { fontSize: 13, color: '#666' },

  modalBox: { backgroundColor: '#FFF', width: '85%', padding: 25, borderRadius: 20 },
  stateOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  stateIcon: { fontSize: 24, marginRight: 15 },
  stateText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cancelButton: { padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginTop: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 20 },
});