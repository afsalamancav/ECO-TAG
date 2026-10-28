import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

// Simulamos la base de datos. "estado" puede ser: 'Asignada', 'En Lavandería', 'Perdida'
const PRENDAS_INICIALES = [
  { id: 'NFC-001', tipo: 'Sábana Queen', estado: 'Asignada' },
  { id: 'NFC-003', tipo: 'Toalla de baño', estado: 'Asignada' },
];

// Simulamos prendas que están en el almacén y se pueden escanear
const PRENDAS_ALMACEN = [
  { id: 'NFC-002', tipo: 'Sábana King' },
  { id: 'NFC-004', tipo: 'Funda de almohada' },
  { id: 'NFC-005', tipo: 'Bata de baño' },
];

export default function Hotel() {
  const router = useRouter();

  const [habitacionBloqueada, setHabitacionBloqueada] = useState<string | null>(null);
  const [prendasHabitacion, setPrendasHabitacion] = useState<any[]>(PRENDAS_INICIALES);
  
  // Modales
  const [modalQRVisible, setModalQRVisible] = useState(false);
  const [modalNFCVisible, setModalNFCVisible] = useState(false);
  const [prendaEscaneada, setPrendaEscaneada] = useState<any>(null);
  
  // Modal para cambiar el estado de una prenda
  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);
  const [prendaAEditar, setPrendaAEditar] = useState<any>(null);

  // --- PASO 1: ESCANEAR QR DE HABITACIÓN ---
  const confirmarHabitacion = (hab: string) => {
    setHabitacionBloqueada(hab);
    setModalQRVisible(false);
  };

  // --- PASO 2: ESCANEAR NFC ---
  const simularEscaneoNFC = () => {
    // Simulamos que el lector NFC detecta una prenda del almacén
    const prendaAleatoria = PRENDAS_ALMACEN[Math.floor(Math.random() * PRENDAS_ALMACEN.length)];
    
    // Validar que no esté ya en la habitación
    if (prendasHabitacion.find(p => p.id === prendaAleatoria.id && p.estado === 'Asignada')) {
      Alert.alert("Atención", `La prenda ${prendaAleatoria.tipo} ya está asignada a esta habitación.`);
      return;
    }

    setPrendaEscaneada(prendaAleatoria);
    setModalNFCVisible(true);
  };

  const confirmarAccionNFC = (accion: 'Asignar' | 'Lavanderia') => {
    const nuevaPrenda = {
      id: prendaEscaneada.id,
      tipo: prendaEscaneada.tipo,
      estado: accion === 'Asignar' ? 'Asignada' : 'En Lavandería',
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };

    // Si ya existe en la lista (ej. estaba en lavandería), actualizamos su estado. Si no, la agregamos.
    const existe = prendasHabitacion.findIndex(p => p.id === nuevaPrenda.id);
    if (existe >= 0) {
      const nuevas = [...prendasHabitacion];
      nuevas[existe] = nuevaPrenda;
      setPrendasHabitacion(nuevas);
    } else {
      setPrendasHabitacion([...prendasHabitacion, nuevaPrenda]);
    }

    setModalNFCVisible(false);
    setPrendaEscaneada(null);
    
    if (accion === 'Asignar') {
      Alert.alert("✅ Asignada", `${nuevaPrenda.tipo} añadida a la habitación.`);
    } else {
      Alert.alert("🧺 Enviada", `${nuevaPrenda.tipo} enviada a lavandería.`);
    }
  };

  // --- PASO 3: REPORTAR ESTADO (LAVANDERÍA / PERDIDA) ---
  const abrirModalEstado = (prenda: any) => {
    setPrendaAEditar(prenda);
    setModalEstadoVisible(true);
  };

  const cambiarEstadoPrenda = (nuevoEstado: string) => {
    if (!prendaAEditar) return;
    
    Alert.alert(
      "Confirmar acción",
      `¿Estás seguro de cambiar el estado de ${prendaAEditar.tipo} a "${nuevoEstado}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, cambiar", onPress: () => {
            const nuevas = prendasHabitacion.map(p => 
              p.id === prendaAEditar.id ? { ...p, estado: nuevoEstado } : p
            );
            setPrendasHabitacion(nuevas);
            setModalEstadoVisible(false);
          } 
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL: SIMULAR ESCANEO QR */}
      <Modal visible={modalQRVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📷 Escanear QR</Text>
            <Text style={styles.modalSub}>Apunta al código QR en la puerta de la habitación.</Text>
            <TouchableOpacity style={styles.simulateOption} onPress={() => confirmarHabitacion('305')}>
              <Text style={styles.simulateText}>Simular QR: Habitación 305</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalQRVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ACCIÓN TRAS ESCANEAR NFC */}
      <Modal visible={modalNFCVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📡 Prenda Detectada</Text>
            <Text style={styles.modalSub}>El chip NFC ha leído la siguiente prenda:</Text>
            
            <View style={styles.scannedItemBox}>
              <Text style={styles.scannedItemTitle}>{prendaEscaneada?.tipo}</Text>
              <Text style={styles.scannedItemId}>ID: {prendaEscaneada?.id}</Text>
            </View>

            <Text style={styles.label}>¿Qué deseas hacer con ella?</Text>
            
            <TouchableOpacity style={styles.actionAsignar} onPress={() => confirmarAccionNFC('Asignar')}>
              <Text style={styles.actionAsignarText}>✅ Asignar a Hab. {habitacionBloqueada}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionLavanderia} onPress={() => confirmarAccionNFC('Lavanderia')}>
              <Text style={styles.actionLavanderiaText}>🧺 Enviar directamente a Lavandería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalNFCVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: REPORTAR ESTADO DE UNA PRENDA YA ASIGNADA */}
      <Modal visible={modalEstadoVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reportar Estado</Text>
            <Text style={styles.modalSub}>Selecciona el nuevo estado para <Text style={{fontWeight: 'bold'}}>{prendaAEditar?.tipo}</Text>.</Text>
            
            <TouchableOpacity style={styles.stateButton} onPress={() => cambiarEstadoPrenda('En Lavandería')}>
              <Text style={styles.stateIcon}>🧺</Text>
              <View>
                <Text style={styles.stateTitle}>Enviar a Lavandería</Text>
                <Text style={styles.stateDesc}>El textil está sucio y requiere lavado.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stateButton} onPress={() => cambiarEstadoPrenda('Perdida')}>
              <Text style={styles.stateIcon}>❓</Text>
              <View>
                <Text style={styles.stateTitle}>Reportar como Perdida</Text>
                <Text style={styles.stateDesc}>No se encontró el textil en la habitación. (El admin decidirá si darlo de baja).</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalEstadoVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- INTERFAZ PRINCIPAL --- */}
      <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
        <Text style={styles.backText}>← Cambiar de Rol</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Personal de Hotel</Text>
      
      {!habitacionBloqueada && (
        <>
          <View style={styles.introBox}>
            <Text style={styles.introTitle}>👋 ¿Cómo funciona?</Text>
            <Text style={styles.introText}>
              1. Escanea el QR de la puerta de la habitación.{"\n"}
              2. Revisa la lista de prendas asignadas. Si falta alguna, repórtala como perdida.{"\n"}
              3. Si encuentras prendas sucias, envíalas a lavandería.{"\n"}
              4. Usa el lector NFC para añadir nuevas prendas.
            </Text>
          </View>

          <TouchableOpacity style={styles.mainScanButton} onPress={() => setModalQRVisible(true)}>
            <Text style={styles.mainScanIcon}>📷</Text>
            <Text style={styles.mainScanText}>Escanear QR de Habitación</Text>
          </TouchableOpacity>
        </>
      )}

      {habitacionBloqueada && (
        <View>
          <View style={styles.roomLockedBanner}>
            <View>
              <Text style={styles.roomLockedLabel}>Revisando Habitación:</Text>
              <Text style={styles.roomLockedNumber}>HAB. {habitacionBloqueada}</Text>
            </View>
            <Text style={styles.lockIcon}>🔓</Text>
          </View>

          <Text style={styles.sectionTitle}>Inventario de la Habitación ({prendasHabitacion.length})</Text>

          {prendasHabitacion.map((prenda, index) => (
            <View key={index} style={styles.prendaCard}>
              <View style={styles.prendaHeader}>
                <Text style={styles.prendaId}>{prenda.id}</Text>
                <View style={[
                  styles.estadoBadge, 
                  prenda.estado === 'Asignada' ? styles.badgeGreen : 
                  prenda.estado === 'En Lavandería' ? styles.badgeOrange : styles.badgeRed
                ]}>
                  <Text style={styles.estadoText}>{prenda.estado}</Text>
                </View>
              </View>
              <Text style={styles.prendaName}>{prenda.tipo}</Text>
              
              {/* Si la prenda sigue asignada, permitimos reportarla */}
              {prenda.estado === 'Asignada' ? (
                <TouchableOpacity style={styles.reportButton} onPress={() => abrirModalEstado(prenda)}>
                  <Text style={styles.reportText}>⚠️ Reportar Estado / Novedad</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noActionText}>Esta prenda ya fue procesada. Solo el administrador puede cambiar su estado.</Text>
              )}
            </View>
          ))}

          {/* SECCIÓN: AÑADIR MÁS PRENDAS */}
          <View style={styles.addSection}>
            <Text style={styles.sectionTitle}>Añadir Prendas</Text>
            <TouchableOpacity style={styles.addNFCButton} onPress={simularEscaneoNFC}>
              <Text style={styles.addNFCIcon}>📡</Text>
              <Text style={styles.addNFCText}>Escanear Chip NFC</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.finishButton} onPress={() => setHabitacionBloqueada(null)}>
            <Text style={styles.finishText}>Terminar Revisión</Text>
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

  // Caja de introducción
  introBox: { backgroundColor: '#E3F2FD', padding: 20, borderRadius: 16, marginBottom: 25, borderLeftWidth: 5, borderLeftColor: '#1565C0' },
  introTitle: { fontSize: 16, fontWeight: 'bold', color: '#0D47A1', marginBottom: 10 },
  introText: { fontSize: 13, color: '#333', lineHeight: 22 },

  // Botón grande de escaneo QR
  mainScanButton: { backgroundColor: '#1565C0', padding: 30, borderRadius: 20, alignItems: 'center', shadowColor: '#1565C0', shadowOpacity: 0.3, elevation: 5, marginTop: 20 },
  mainScanIcon: { fontSize: 50, marginBottom: 15 },
  mainScanText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  // Banner de habitación
  roomLockedBanner: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, borderWidth: 2, borderColor: '#1565C0' },
  roomLockedLabel: { fontSize: 14, color: '#666', fontWeight: 'bold' },
  roomLockedNumber: { fontSize: 32, fontWeight: '900', color: '#1565C0' },
  lockIcon: { fontSize: 32 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },

  // Tarjeta de prenda en la habitación
  prendaCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  prendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prendaId: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  prendaName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeOrange: { backgroundColor: '#FFF3E0' },
  badgeRed: { backgroundColor: '#FFEBEE' },
  estadoText: { fontSize: 11, fontWeight: 'bold', color: '#333' },

  reportButton: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, alignItems: 'center' },
  reportText: { color: '#FF9800', fontWeight: 'bold', fontSize: 14 },
  noActionText: { fontSize: 12, color: '#999', fontStyle: 'italic', marginTop: 5 },

  // Sección de añadir
  addSection: { marginTop: 20, marginBottom: 20 },
  addNFCButton: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#1565C0', padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addNFCIcon: { fontSize: 24, marginRight: 10 },
  addNFCText: { color: '#1565C0', fontSize: 18, fontWeight: 'bold' },

  finishButton: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 12, alignItems: 'center', shadowColor: '#2E7D32', shadowOpacity: 0.3, elevation: 4, marginTop: 10 },
  finishText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Modales Generales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '90%', padding: 25, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  
  simulateOption: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  simulateText: { color: '#1565C0', fontWeight: 'bold' },
  cancelButton: { padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginTop: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },

  // Estilos para el modal de acción NFC
  scannedItemBox: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  scannedItemTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  scannedItemId: { fontSize: 13, color: '#888', marginTop: 3 },
  
  actionAsignar: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#A5D6A7' },
  actionAsignarText: { color: '#2E7D32', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  
  actionLavanderia: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FFCC80' },
  actionLavanderiaText: { color: '#E65100', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },

  // Estilos para el modal de reportar estado
  stateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  stateIcon: { fontSize: 24, marginRight: 15 },
  stateTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  stateDesc: { fontSize: 12, color: '#888', marginTop: 2, maxWidth: '85%' },
});