import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { supabase } from '../../conexion/supabase';
import { obtenerIdHotel } from '../../conexion/sesion'; 

export default function Hotel() {
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [isScanningNFC, setIsScanningNFC] = useState(false);

  const [habitacion, setHabitacion] = useState<any>(null);
  const [prendasHabitacion, setPrendasHabitacion] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Modales
  const [modalNFCVisible, setModalNFCVisible] = useState(false);
  const [prendaEscaneada, setPrendaEscaneada] = useState<any>(null);
  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);
  const [prendaAEditar, setPrendaAEditar] = useState<any>(null);

  // NUEVO: Estado para saber si escaneamos para reportar una novedad
  const [escaneandoParaReportar, setEscaneandoParaReportar] = useState(false);

  useEffect(() => {
    NfcManager.start();
    return () => { NfcManager.cancelTechnologyRequest().catch(() => 0); };
  }, []);

  // --- 1. ESCANEAR QR ---
  const abrirEscanerQR = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara.");
    }
    setIsScanningQR(true);
  };

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    setIsScanningQR(false);
    const numHab = data.includes('/') ? data.split('/').pop() : data;

    setCargando(true);
    const idHotel = await obtenerIdHotel(); 

    const { data: habData, error } = await supabase
      .from('habitaciones')
      .select('*')
      .eq('numero_habitacion', numHab)
      .eq('id_hotel', idHotel) 
      .single();

    if (error || !habData) {
      Alert.alert("Error", "Esta habitación no está registrada en tu hotel.");
      setCargando(false);
      return;
    }

    setHabitacion(habData);
    await cargarPrendasHabitacion(habData.id);
    setCargando(false);
  };

  const cargarPrendasHabitacion = async (idHabitacion: string) => {
    const { data, error } = await supabase
      .from('asignaciones')
      .select(`id, articulos (id, nfc_uid, tipo_prenda, estado)`)
      .eq('id_habitacion', idHabitacion)
      .eq('activa', true); 

    if (!error && data) {
      const formateadas = data.map((a: any) => ({
        asignacion_id: a.id,
        id: a.articulos.id,
        nfc_uid: a.articulos.nfc_uid,
        tipo: a.articulos.tipo_prenda,
        estado: a.articulos.estado
      }));
      setPrendasHabitacion(formateadas);
    }
  };

  // --- 2. ESCANEAR NFC (Lógica dual: Asignar o Reportar) ---
  const abrirEscanerNFC = async (paraReportar: boolean = false) => {
    setEscaneandoParaReportar(paraReportar);
    setIsScanningNFC(true);
    const idHotel = await obtenerIdHotel();
    
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        const idEscaneado = tag.id.toUpperCase();
        
        if (paraReportar) {
          // Lógica para REPORTAR: Buscar en la lista local de la habitación
          const prendaEncontrada = prendasHabitacion.find(p => p.nfc_uid === idEscaneado);
          
          if (prendaEncontrada) {
            setPrendaAEditar(prendaEncontrada);
            setModalEstadoVisible(true);
          } else {
            Alert.alert("No encontrada", "Esta prenda no pertenece al inventario activo de esta habitación.");
          }
        } else {
          // Lógica para ASIGNAR: Buscar en la base de datos global de este hotel
          const { data: prendaData, error } = await supabase
            .from('articulos')
            .select('*')
            .eq('nfc_uid', idEscaneado)
            .eq('id_hotel', idHotel) 
            .single();

          if (error || !prendaData) {
            Alert.alert("No encontrada", "Este chip no está registrado en tu hotel.");
          } else if (prendaData.estado !== 'Disponible') {
            Alert.alert("Atención", `Esta prenda está en estado: ${prendaData.estado}`);
          } else {
            setPrendaEscaneada(prendaData);
            setModalNFCVisible(true);
          }
        }
      }
    } catch (ex) {
      Alert.alert("Error", "No se pudo leer el chip NFC.");
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      setIsScanningNFC(false);
      setEscaneandoParaReportar(false);
    }
  };

  const confirmarAccionNFC = async (accion: 'Asignar' | 'Lavanderia') => {
    if (!prendaEscaneada || !habitacion) return;
    const idHotel = await obtenerIdHotel();

    if (accion === 'Asignar') {
      const { error: errorAsignacion } = await supabase.from('asignaciones').insert([
        { id_articulo: prendaEscaneada.id, id_habitacion: habitacion.id, activa: true, id_hotel: idHotel } 
      ]);

      const { error: errorArticulo } = await supabase.from('articulos').update({ estado: 'Asignada' }).eq('id', prendaEscaneada.id);

      if (errorAsignacion || errorArticulo) {
        Alert.alert("Error", "No se pudo asignar.");
      } else {
        await supabase.from('historial').insert([{ 
          id_articulo: prendaEscaneada.id, 
          evento: 'Asignación a Habitación', 
          detalle: `Asignada a la Habitación ${habitacion.numero_habitacion}`,
          id_hotel: idHotel 
        }]);

        Alert.alert("✅ Asignada", `${prendaEscaneada.tipo_prenda} añadida a la habitación.`);
        cargarPrendasHabitacion(habitacion.id);
      }
    } else {
      const { error } = await supabase.from('articulos').update({ estado: 'En Tránsito' }).eq('id', prendaEscaneada.id);
      
      if (error) {
        Alert.alert("Error", "No se pudo enviar.");
      } else {
        await supabase.from('historial').insert([{ 
          id_articulo: prendaEscaneada.id, 
          evento: 'Envío a Lavandería', 
          detalle: `Sale de la Habitación ${habitacion.numero_habitacion} hacia lavandería.`,
          id_hotel: idHotel 
        }]);

        Alert.alert("🚚 En Tránsito", `${prendaEscaneada.tipo_prenda} en camino a lavandería.`);
      }
    }
    setModalNFCVisible(false);
    setPrendaEscaneada(null);
  };

  // --- 3. REPORTAR ESTADO (Lavandería/Pérdida) ---
  const cambiarEstadoPrenda = async (nuevoEstado: string) => {
    if (!prendaAEditar) return;
    const idHotel = await obtenerIdHotel();
    const estadoFinal = nuevoEstado === 'Lavandería' ? 'En Tránsito' : nuevoEstado;

    const { error: errorArt } = await supabase.from('articulos').update({ estado: estadoFinal }).eq('id', prendaAEditar.id);
    const { error: errorAsig } = await supabase.from('asignaciones').update({ activa: false, fecha_liberacion: new Date().toISOString() }).eq('id', prendaAEditar.asignacion_id);

    if (errorArt || errorAsig) {
      Alert.alert("Error", "No se pudo actualizar el estado.");
    } else {
      await supabase.from('historial').insert([{ 
        id_articulo: prendaAEditar.id, 
        evento: nuevoEstado === 'Lavandería' ? 'Reporte de Limpieza' : 'Reporte de Pérdida', 
        detalle: `El personal de hotel reportó la prenda como: ${nuevoEstado}`,
        id_hotel: idHotel 
      }]);

      Alert.alert("✅ Actualizado", `La prenda ha sido reportada.`);
      cargarPrendasHabitacion(habitacion.id);
      setModalEstadoVisible(false);
    }
  };

  const finalizarRevision = () => {
    setHabitacion(null);
    setPrendasHabitacion([]);
  };

  if (isScanningQR) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onBarcodeScanned} />
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraText}>Apunta al código QR de la puerta</Text>
          <TouchableOpacity style={styles.cancelCameraBtn} onPress={() => setIsScanningQR(false)}>
            <Text style={styles.cancelCameraText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL ESCANEANDO NFC */}
      <Modal visible={isScanningNFC} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color="#1565C0" />
            <Text style={styles.scanningTitle}>
              {escaneandoParaReportar ? 'Escaneando para Reportar...' : 'Buscando Chip NFC...'}
            </Text>
            <Text style={styles.scanningText}>Acerca el chip a la parte trasera del celular.</Text>
            <TouchableOpacity style={styles.cancelScanBtn} onPress={() => { NfcManager.cancelTechnologyRequest(); setIsScanningNFC(false); }}>
              <Text style={styles.cancelScanText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL ACCIÓN TRAS ESCANEAR NFC (ASIGNAR) */}
      <Modal visible={modalNFCVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📡 Prenda Detectada</Text>
            <View style={styles.scannedItemBox}>
              <Text style={styles.scannedItemTitle}>{prendaEscaneada?.tipo_prenda}</Text>
              <Text style={styles.scannedItemId}>ID: {prendaEscaneada?.nfc_uid}</Text>
            </View>
            <Text style={styles.label}>¿Qué deseas hacer?</Text>
            
            <TouchableOpacity style={styles.actionAsignar} onPress={() => confirmarAccionNFC('Asignar')}>
              <Text style={styles.actionAsignarText}>✅ Asignar a Hab. {habitacion?.numero_habitacion}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionLavanderia} onPress={() => confirmarAccionNFC('Lavanderia')}>
              <Text style={styles.actionLavanderiaText}>🧺 Enviar a Lavandería</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalNFCVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL REPORTAR ESTADO */}
      <Modal visible={modalEstadoVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reportar Novedad</Text>
            <Text style={styles.modalSub}>¿Qué pasó con la prenda <Text style={{fontWeight: 'bold'}}>{prendaAEditar?.nfc_uid}</Text> ({prendaAEditar?.tipo})?</Text>
            
            <TouchableOpacity style={styles.stateButton} onPress={() => cambiarEstadoPrenda('Lavandería')}>
              <Text style={styles.stateIcon}>🧺</Text>
              <View><Text style={styles.stateTitle}>Enviar a Lavandería</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stateButton} onPress={() => cambiarEstadoPrenda('Perdida')}>
              <Text style={styles.stateIcon}>❓</Text>
              <View><Text style={styles.stateTitle}>Reportar como Perdida</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalEstadoVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
        <Text style={styles.backText}>← Cambiar de Rol</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Personal de Hotel</Text>
      
      {!habitacion && !cargando && (
        <>
          <View style={styles.introBox}>
            <Text style={styles.introTitle}>👋 ¿Cómo funciona?</Text>
            <Text style={styles.introText}>
              1. Escanea el QR de la puerta.{"\n"}
              2. Revisa el inventario asignado a esa habitación.{"\n"}
              3. Usa el lector NFC para añadir o reportar prendas.
            </Text>
          </View>
          <TouchableOpacity style={styles.mainScanButton} onPress={abrirEscanerQR}>
            <Text style={styles.mainScanIcon}>📷</Text>
            <Text style={styles.mainScanText}>Escanear QR de Habitación</Text>
          </TouchableOpacity>
        </>
      )}

      {cargando && <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 50 }} />}

      {habitacion && !cargando && (
        <View>
          <View style={styles.roomLockedBanner}>
            <View>
              <Text style={styles.roomLockedLabel}>Revisando Habitación:</Text>
              <Text style={styles.roomLockedNumber}>HAB. {habitacion.numero_habitacion}</Text>
            </View>
            <Text style={styles.lockIcon}>🔓</Text>
          </View>

          <Text style={styles.sectionTitle}>Inventario ({prendasHabitacion.length})</Text>

          {prendasHabitacion.map((prenda) => (
            <View key={prenda.id} style={styles.prendaCard}>
              <View style={styles.prendaHeader}>
                <Text style={styles.prendaId}>{prenda.nfc_uid}</Text>
                <View style={[styles.estadoBadge, prenda.estado === 'Asignada' ? styles.badgeGreen : styles.badgeOrange]}>
                  <Text style={styles.estadoText}>{prenda.estado}</Text>
                </View>
              </View>
              <Text style={styles.prendaName}>{prenda.tipo}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Acciones</Text>
          
          {/* BOTÓN PARA ESCANEAR NUEVAS PRENDAS */}
          <TouchableOpacity style={styles.addNFCButton} onPress={() => abrirEscanerNFC(false)}>
            <Text style={styles.addNFCIcon}>📡</Text>
            <Text style={styles.addNFCText}>Escanear NFC para Añadir</Text>
          </TouchableOpacity>

          {/* NUEVO BOTÓN PARA REPORTAR UNA PRENDA ESPECÍFICA */}
          <TouchableOpacity style={styles.reportNFCButton} onPress={() => abrirEscanerNFC(true)}>
            <Text style={styles.reportNFCIcon}>⚠️</Text>
            <Text style={styles.reportNFCText}>Escanear NFC para Reportar Novedad</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.finishButton} onPress={finalizarRevision}>
            <Text style={styles.finishText}>🔓 Terminar Revisión</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#1565C0', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#0D47A1', marginBottom: 20 },
  introBox: { backgroundColor: '#E3F2FD', padding: 20, borderRadius: 16, marginBottom: 25, borderLeftWidth: 5, borderLeftColor: '#1565C0' },
  introTitle: { fontSize: 16, fontWeight: 'bold', color: '#0D47A1', marginBottom: 10 },
  introText: { fontSize: 13, color: '#333', lineHeight: 22 },
  mainScanButton: { backgroundColor: '#1565C0', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5, marginTop: 20 },
  mainScanIcon: { fontSize: 50, marginBottom: 15 },
  mainScanText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  roomLockedBanner: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderWidth: 2, borderColor: '#1565C0' },
  roomLockedLabel: { fontSize: 14, color: '#666', fontWeight: 'bold' },
  roomLockedNumber: { fontSize: 32, fontWeight: '900', color: '#1565C0' },
  lockIcon: { fontSize: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  prendaCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2 },
  prendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prendaId: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  prendaName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeOrange: { backgroundColor: '#FFF3E0' },
  estadoText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  
  addNFCButton: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#1565C0', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  addNFCIcon: { fontSize: 24, marginRight: 10 },
  addNFCText: { color: '#1565C0', fontSize: 18, fontWeight: 'bold' },

  reportNFCButton: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#FF9800', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  reportNFCIcon: { fontSize: 24, marginRight: 10 },
  reportNFCText: { color: '#FF9800', fontSize: 18, fontWeight: 'bold' },

  finishButton: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4 },
  finishText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '90%', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  cancelButton: { padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginTop: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  scannedItemBox: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  scannedItemTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  scannedItemId: { fontSize: 13, color: '#888', marginTop: 3 },
  actionAsignar: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#A5D6A7' },
  actionAsignarText: { color: '#2E7D32', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  actionLavanderia: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FFCC80' },
  actionLavanderiaText: { color: '#E65100', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  stateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  stateIcon: { fontSize: 24, marginRight: 15 },
  stateTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  cameraText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  cancelCameraBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 10 },
  cancelCameraText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
  scanningBox: { backgroundColor: '#FFF', width: '85%', padding: 30, borderRadius: 20, alignItems: 'center' },
  scanningTitle: { fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginTop: 20, marginBottom: 10 },
  scanningText: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 25 },
  cancelScanBtn: { padding: 15, backgroundColor: '#FFEBEE', borderRadius: 10, width: '100%', alignItems: 'center' },
  cancelScanText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
});