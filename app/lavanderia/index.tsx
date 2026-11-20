import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../conexion/supabase';
import { obtenerIdHotel } from '../../conexion/sesion'; // IMPORTANTE
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import Storage from 'expo-sqlite/kv-store';

export default function Lavanderia() {
  const router = useRouter();

  const [loteActual, setLoteActual] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [modalNFCVisible, setModalNFCVisible] = useState(false);
  const [prendaEscaneada, setPrendaEscaneada] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  // Al iniciar, cargamos el lote guardado en caché
  useEffect(() => {
    NfcManager.start();
    cargarLoteCache();
    return () => { NfcManager.cancelTechnologyRequest().catch(() => 0); };
  }, []);

  const cargarLoteCache = async () => {
    try {
      const guardados = await Storage.getItem('@ecotag_lote_actual');
      if (guardados) setLoteActual(JSON.parse(guardados));
    } catch (e) {
      console.log("Error cargando lote", e);
    }
    setCargando(false);
  };

  const guardarLoteCache = async (nuevoLote: any[]) => {
    setLoteActual(nuevoLote);
    try {
      await Storage.setItem('@ecotag_lote_actual', JSON.stringify(nuevoLote));
    } catch (e) {
      console.log("Error guardando lote", e);
    }
  };

  // --- ESCANEAR PRENDA CON NFC ---
  const escanearNFC = async () => {
    setIsScanning(true);
    const idHotel = await obtenerIdHotel();

    if (!idHotel) {
      Alert.alert("Error", "No se ha configurado el hotel.");
      setIsScanning(false);
      return;
    }

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        const idEscaneado = tag.id.toUpperCase();
        
        // Buscamos la prenda SOLO en este hotel
        const { data, error } = await supabase
          .from('articulos')
          .select('*')
          .eq('nfc_uid', idEscaneado)
          .eq('id_hotel', idHotel)
          .single();

        if (error || !data) {
          Alert.alert("No encontrada", "Este chip no está registrado en tu hotel.");
        } else if (data.estado === 'Lavandería') {
          Alert.alert("Atención", "Esta prenda ya fue recibida en la lavandería.");
        } else if (data.estado === 'Disponible') {
          Alert.alert("Atención", "Esta prenda está 'Disponible'. No debería estar aquí.");
        } else if (data.estado === 'En Tránsito') {
          setPrendaEscaneada(data);
          setModalNFCVisible(true);
        } else {
          Alert.alert("Estado desconocido", `La prenda está en estado: ${data.estado}`);
        }
      }
    } catch (ex) {
      Alert.alert("Error", "No se pudo leer el chip NFC.");
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      setIsScanning(false);
    }
  };

  // --- CONFIRMAR RECEPCIÓN (ESTADO + HISTORIAL) ---
  const confirmarRecepcion = async () => {
    if (!prendaEscaneada) return;
    const idHotel = await obtenerIdHotel();

    // 1. Actualizamos a 'Lavandería'
    const { error } = await supabase.from('articulos').update({ estado: 'Lavandería' }).eq('id', prendaEscaneada.id);

    if (error) {
      Alert.alert("Error", "No se pudo actualizar en la nube.");
    } else {
      // 2. Guardamos en el historial con el id_hotel
      await supabase.from('historial').insert([{ 
        id_articulo: prendaEscaneada.id, 
        evento: 'Recepción en Lavandería', 
        detalle: 'La prenda llegó a la lavandería y fue añadida al lote.',
        id_hotel: idHotel // <-- GUARDAMOS EL HOTEL
      }]);

      // 3. Agregamos al lote local
      const nuevaEnLote = {
        id: prendaEscaneada.id,
        nfc_uid: prendaEscaneada.nfc_uid,
        tipo: prendaEscaneada.tipo_prenda,
        hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };
      guardarLoteCache([...loteActual, nuevaEnLote]);
      setModalNFCVisible(false);
      setPrendaEscaneada(null);
      Alert.alert("✅ Recibida", `${nuevaEnLote.tipo} añadida al lote.`);
    }
  };

  // --- FINALIZAR LOTE (ESTADO + HISTORIAL) ---
  const finalizarLote = async () => {
    if (loteActual.length === 0) return;
    const ids = loteActual.map(p => p.id);
    const idHotel = await obtenerIdHotel();
    
    setCargando(true);
    
    // 1. Actualizamos todas las prendas a 'Disponible'
    const { error } = await supabase.from('articulos').update({ estado: 'Disponible' }).in('id', ids);

    if (!error) {
      // 2. Guardamos los eventos en el historial
      const eventos = loteActual.map(p => ({
        id_articulo: p.id,
        evento: 'Lavado Completado',
        detalle: 'La prenda terminó su ciclo de lavado y volvió al almacén.',
        id_hotel: idHotel // <-- GUARDAMOS EL HOTEL
      }));
      await supabase.from('historial').insert(eventos);

      // 3. Vaciamos el lote local
      guardarLoteCache([]);
      Alert.alert("Lote Finalizado", "Las prendas han vuelto al almacén.");
    } else {
      Alert.alert("Error", "No se pudo finalizar el lote.");
    }
    setCargando(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL ESCANEANDO NFC */}
      <Modal visible={isScanning} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color="#E65100" />
            <Text style={styles.scanningTitle}>Escaneando Chip NFC...</Text>
            <Text style={styles.scanningText}>Acerca el chip a la parte trasera del celular.</Text>
            <TouchableOpacity style={styles.cancelScanBtn} onPress={() => { NfcManager.cancelTechnologyRequest(); setIsScanning(false); }}>
              <Text style={styles.cancelScanText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PRENDA DETECTADA */}
      <Modal visible={modalNFCVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📡 Prenda Detectada</Text>
            
            <View style={styles.scannedItemBox}>
              <Text style={styles.scannedItemTitle}>{prendaEscaneada?.tipo_prenda}</Text>
              <Text style={styles.scannedItemId}>ID: {prendaEscaneada?.nfc_uid}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoTitle}>💧 Instrucciones</Text>
              <Text style={styles.infoText}>Lavar según la composición registrada en el sistema.</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalNFCVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={confirmarRecepcion}>
                <Text style={styles.saveText}>Añadir al Lote</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
        <Text style={styles.backText}>← Cambiar de Rol</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Lavandería</Text>
      
      {loteActual.length === 0 && !cargando && (
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>🧺 Recepción de Textiles</Text>
          <Text style={styles.introText}>
            Escanea las prendas que llegan del hotel. El sistema confirmará que estén en tránsito.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.mainScanButton} onPress={escanearNFC} disabled={isScanning}>
        <Text style={styles.mainScanIcon}>📡</Text>
        <Text style={styles.mainScanText}>Escanear Prenda NFC</Text>
      </TouchableOpacity>

      {loteActual.length > 0 && (
        <View style={styles.loteContainer}>
          <Text style={styles.sectionTitle}>Lote en Proceso ({loteActual.length})</Text>

          {loteActual.map((prenda, index) => (
            <View key={index} style={styles.loteItem}>
              <View style={styles.loteLeft}>
                <Text style={styles.loteIcon}>🧺</Text>
                <View>
                  <Text style={styles.loteName}>{prenda.tipo}</Text>
                  <Text style={styles.loteId}>{prenda.nfc_uid} • {prenda.hora}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => guardarLoteCache(loteActual.filter(p => p.id !== prenda.id))}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.finishButton} onPress={finalizarLote}>
            <Text style={styles.finishText}>✅ Marcar Lote como Lavado</Text>
          </TouchableOpacity>
        </View>
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

  introBox: { backgroundColor: '#FFF3E0', padding: 20, borderRadius: 16, marginBottom: 25, borderLeftWidth: 5, borderLeftColor: '#E65100' },
  introTitle: { fontSize: 16, fontWeight: 'bold', color: '#BF360C', marginBottom: 10 },
  introText: { fontSize: 13, color: '#333', lineHeight: 22 },

  mainScanButton: { backgroundColor: '#E65100', padding: 30, borderRadius: 20, alignItems: 'center', shadowColor: '#E65100', shadowOpacity: 0.3, elevation: 5, marginBottom: 25 },
  mainScanIcon: { fontSize: 50, marginBottom: 15 },
  mainScanText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  loteContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  loteItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  loteLeft: { flexDirection: 'row', alignItems: 'center' },
  loteIcon: { fontSize: 24, marginRight: 15 },
  loteName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  loteId: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteIcon: { fontSize: 20, color: '#D32F2F', padding: 5 },

  finishButton: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  finishText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFF', width: '100%', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  
  scannedItemBox: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  scannedItemTitle: { fontSize: 22, fontWeight: 'bold', color: '#BF360C' },
  scannedItemId: { fontSize: 13, color: '#888', marginTop: 3 },
  
  infoBlock: { backgroundColor: '#F0F8FF', padding: 15, borderRadius: 10, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#1565C0', marginBottom: 5 },
  infoText: { fontSize: 13, color: '#333' },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  saveButton: { flex: 1, backgroundColor: '#E65100', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  scanningBox: { backgroundColor: '#FFF', width: '85%', padding: 30, borderRadius: 20, alignItems: 'center' },
  scanningTitle: { fontSize: 22, fontWeight: 'bold', color: '#E65100', marginTop: 20, marginBottom: 10 },
  scanningText: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 25 },
  cancelScanBtn: { padding: 15, backgroundColor: '#FFEBEE', borderRadius: 10, width: '100%', alignItems: 'center' },
  cancelScanText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
});