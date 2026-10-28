import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
// SOLUCIÓN: Usamos la API de almacenamiento integrada en Expo
import Storage from 'expo-sqlite/kv-store';

const BASE_DATOS = [
  { id: 'NFC-001', tipo: 'Sábana Queen', composicion: '50% Algodón / 50% Poliéster', instrucciones: 'Lavar a 60°C.', cuidadoEspecial: 'No usar blanqueador.' },
  { id: 'NFC-002', tipo: 'Bata de baño', composicion: '100% Tencel', instrucciones: 'Lavar a 30°C.', cuidadoEspecial: 'No usar secadora.' },
  { id: 'NFC-003', tipo: 'Toalla de baño', composicion: '100% Algodón', instrucciones: 'Lavar a 40°C.', cuidadoEspecial: 'Evitar suavizantes.' },
];

export default function Lavanderia() {
  const router = useRouter();

  const [loteRecepcion, setLoteRecepcion] = useState<any[]>([]);
  const [lotesGuardados, setLotesGuardados] = useState<any[]>([]);
  const [prendaEscaneada, setPrendaEscaneada] = useState<any>(null);
  const [modalNFCVisible, setModalNFCVisible] = useState(false);

  useEffect(() => {
    const cargarLotes = async () => {
      try {
        const guardados = await Storage.getItem('@ecotag_lotes');
        if (guardados) setLotesGuardados(JSON.parse(guardados));
      } catch (e) {
        console.log("Error cargando lotes", e);
      }
    };
    cargarLotes();
  }, []);

  const actualizarMemoria = async (nuevosLotes: any[]) => {
    setLotesGuardados(nuevosLotes);
    try {
      await Storage.setItem('@ecotag_lotes', JSON.stringify(nuevosLotes));
    } catch (e) {
      console.log("Error guardando lotes", e);
    }
  };

  const simularEscaneoNFC = () => {
    const prendaAleatoria = BASE_DATOS[Math.floor(Math.random() * BASE_DATOS.length)];
    if (loteRecepcion.find(p => p.id === prendaAleatoria.id)) {
      Alert.alert("Prenda ya escaneada", "Esta prenda ya está en la lista actual.");
      return;
    }
    setPrendaEscaneada(prendaAleatoria);
    setModalNFCVisible(true);
  };

  const confirmarRecepcion = () => {
    setLoteRecepcion([...loteRecepcion, prendaEscaneada]);
    setModalNFCVisible(false);
    setPrendaEscaneada(null);
  };

  const crearLote = () => {
    if (loteRecepcion.length === 0) return;

    const numeroLote = lotesGuardados.length + 1;
    const fecha = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const nuevoLote = {
      id: `LOTE-${numeroLote}`,
      fecha: fecha,
      estado: 'En Lavado',
      prendas: loteRecepcion
    };

    const nuevosLotes = [nuevoLote, ...lotesGuardados];
    actualizarMemoria(nuevosLotes);
    setLoteRecepcion([]);
    Alert.alert("Lote Creado", `El Lote #${numeroLote} ha ingresado a las máquinas.`);
  };

  const finalizarLote = (idLote: string) => {
    const nuevosLotes = lotesGuardados.map(lote => 
      lote.id === idLote ? { ...lote, estado: 'Finalizado / En Almacén' } : lote
    );
    actualizarMemoria(nuevosLotes);
    Alert.alert("Lote Terminado", `El ${idLote} está listo. Las prendas han vuelto al Almacén.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <Modal visible={modalNFCVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📡 Prenda Detectada</Text>
            <View style={styles.scannedItemBox}>
              <Text style={styles.scannedItemTitle}>{prendaEscaneada?.tipo}</Text>
              <Text style={styles.scannedItemComp}>🧵 {prendaEscaneada?.composicion}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoTitle}>💧 Lavado</Text>
              <Text style={styles.infoText}>{prendaEscaneada?.instrucciones}</Text>
            </View>
            <View style={[styles.infoBlock, { backgroundColor: '#FFF3E0', borderLeftColor: '#FF9800' }]}>
              <Text style={[styles.infoTitle, { color: '#E65100' }]}>⚠️ Cuidado</Text>
              <Text style={styles.infoText}>{prendaEscaneada?.cuidadoEspecial}</Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalNFCVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={confirmarRecepcion}>
                <Text style={styles.saveText}>Añadir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
        <Text style={styles.backText}>← Cambiar de Rol</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Lavandería</Text>

      <View style={styles.introBox}>
        <Text style={styles.introTitle}>1️⃣ Recepción de Ropa Sucia</Text>
        <Text style={styles.introText}>Escanea las prendas para agruparlas en un nuevo lote de lavado.</Text>
      </View>

      <TouchableOpacity style={styles.mainScanButton} onPress={simularEscaneoNFC}>
        <Text style={styles.mainScanIcon}>📡</Text>
        <Text style={styles.mainScanText}>Escanear Prenda</Text>
      </TouchableOpacity>

      {loteRecepcion.length > 0 && (
        <View style={styles.cardContainer}>
          <Text style={styles.cardTitle}>Ropa por enviar ({loteRecepcion.length})</Text>
          {loteRecepcion.map((p, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName}>{p.tipo}</Text>
              <TouchableOpacity onPress={() => setLoteRecepcion(loteRecepcion.filter(x => x.id !== p.id))}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.createLoteBtn} onPress={crearLote}>
            <Text style={styles.createLoteText}>🧺 Crear Lote e Ingresar a Lavado</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>Historial de Lotes</Text>
      
      {lotesGuardados.map((lote) => (
        <View key={lote.id} style={styles.loteCard}>
          <View style={styles.loteHeader}>
            <Text style={styles.loteId}>{lote.id}</Text>
            <View style={[styles.badge, lote.estado === 'En Lavado' ? styles.badgeOrange : styles.badgeGreen]}>
              <Text style={styles.badgeText}>{lote.estado}</Text>
            </View>
          </View>
          <Text style={styles.loteDate}>Ingreso: {lote.fecha}</Text>
          <Text style={styles.loteCount}>Prendas: {lote.prendas.length}</Text>
          
          {lote.estado === 'En Lavado' && (
            <TouchableOpacity style={styles.finishLoteBtn} onPress={() => finalizarLote(lote.id)}>
              <Text style={styles.finishLoteText}>✅ Marcar como Lavado (Devolver a Almacén)</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {lotesGuardados.length === 0 && (
        <Text style={styles.emptyText}>No hay lotes registrados en el historial.</Text>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#E65100', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#BF360C', marginBottom: 20 },

  introBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#E65100' },
  introTitle: { fontSize: 15, fontWeight: 'bold', color: '#BF360C', marginBottom: 5 },
  introText: { fontSize: 13, color: '#333' },

  mainScanButton: { backgroundColor: '#E65100', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  mainScanIcon: { fontSize: 40, marginBottom: 10 },
  mainScanText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  cardContainer: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  itemName: { fontSize: 14, color: '#333' },
  deleteIcon: { color: '#D32F2F', fontWeight: 'bold' },
  createLoteBtn: { backgroundColor: '#1B4D21', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  createLoteText: { color: '#FFF', fontWeight: 'bold' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  loteCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#1565C0', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  loteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  loteId: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  loteDate: { fontSize: 12, color: '#888' },
  loteCount: { fontSize: 14, color: '#555', marginTop: 5, marginBottom: 10 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeOrange: { backgroundColor: '#FFF3E0' },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#333' },

  finishLoteBtn: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7', padding: 12, borderRadius: 8, alignItems: 'center' },
  finishLoteText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#999', fontStyle: 'italic', marginTop: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFF', width: '100%', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  scannedItemBox: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  scannedItemTitle: { fontSize: 20, fontWeight: 'bold', color: '#BF360C' },
  scannedItemComp: { fontSize: 13, color: '#333', marginTop: 5 },
  infoBlock: { backgroundColor: '#F0F8FF', padding: 12, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  infoTitle: { fontSize: 13, fontWeight: 'bold', color: '#1565C0', marginBottom: 3 },
  infoText: { fontSize: 12, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  cancelButton: { flex: 1, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold' },
  saveButton: { flex: 1, backgroundColor: '#E65100', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});