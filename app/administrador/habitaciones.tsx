import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
// IMPORTAMOS SUPABASE
import { supabase } from '../../conexion/supabase';

export default function GestionHabitaciones() {
  const router = useRouter();
  
  // Estados para los datos de la base de datos
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el formulario
  const [nuevaHab, setNuevaHab] = useState('');
  const [searchHab, setSearchHab] = useState('');

  // Estados para los Modales
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editHabText, setEditHabText] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editId, setEditId] = useState<string | null>(null); // Necesitamos el ID de la BD

  const [qrVisible, setQrVisible] = useState<string | null>(null);
  const viewShotRef = useRef<any>(null);

  // --- 1. LEER DATOS AL INICIAR ---
  useEffect(() => {
    cargarHabitaciones();
  }, []);

  const cargarHabitaciones = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('habitaciones')
      .select('*')
      .order('numero_habitacion', { ascending: true });

    if (error) {
      Alert.alert("Error de conexión", error.message);
      console.error(error);
    } else {
      setHabitaciones(data || []);
    }
    setCargando(false);
  };

  // --- 2. CREAR HABITACIÓN ---
  const agregarHabitacion = async () => {
    if (!nuevaHab.trim()) return;
    
    // Validar que no exista localmente (o podrías dejar que la BD lo valide con el UNIQUE)
    if (habitaciones.find(h => h.numero_habitacion === nuevaHab.trim())) {
      Alert.alert("Error", "Esta habitación ya existe.");
      return;
    }

    // Generamos un QR único automáticamente
    const nuevoQr = `QR-HAB-${nuevaHab.trim()}`;

    const { error } = await supabase
      .from('habitaciones')
      .insert([{ numero_habitacion: nuevaHab.trim(), qr_uid: nuevoQr }]);

    if (error) {
      Alert.alert("Error al guardar", error.message);
    } else {
      setNuevaHab('');
      cargarHabitaciones(); // Recargamos la lista
    }
  };

  // --- 3. ELIMINAR HABITACIÓN ---
  const borrarHabitacion = (id: string, numero: string) => {
    Alert.alert(
      "Eliminar Habitación",
      `¿Seguro que deseas eliminar la habitación ${numero}? Su código QR dejará de funcionar.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: async () => {
            const { error } = await supabase.from('habitaciones').delete().eq('id', id);
            if (error) Alert.alert("Error", error.message);
            else cargarHabitaciones();
        }}
      ]
    );
  };

  // --- 4. EDITAR HABITACIÓN ---
  const abrirEdicion = (hab: any, index: number) => {
    setEditHabText(hab.numero_habitacion);
    setEditIndex(index);
    setEditId(hab.id);
    setEditModalVisible(true);
  };

  const guardarEdicion = async () => {
    if (!editHabText.trim() || !editId) return;
    
    // Al cambiar el número, también actualizamos su QR
    const nuevoQr = `QR-HAB-${editHabText.trim()}`;

    const { error } = await supabase
      .from('habitaciones')
      .update({ numero_habitacion: editHabText.trim(), qr_uid: nuevoQr })
      .eq('id', editId);

    if (error) {
      Alert.alert("Error al editar", error.message);
    } else {
      setEditModalVisible(false);
      cargarHabitaciones();
    }
  };

  const descargarQR = async () => {
    if (!viewShotRef.current || !qrVisible) return;
    try {
      const uri = await viewShotRef.current.capture();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: `Guardar HAB_${qrVisible}_QR`,
          UTI: 'public.jpeg',
          mimeType: 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo generar la imagen del QR.");
    }
  };

  const habitacionesFiltradas = habitaciones.filter(h => 
    h.numero_habitacion.toLowerCase().includes(searchHab.toLowerCase())
  );

  // Mostrar pantalla de carga
  if (cargando) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: '#1565C0' }}>Cargando habitaciones desde la nube...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL EDITAR */}
      <Modal visible={editModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar Habitación</Text>
            <TextInput style={styles.modalInput} value={editHabText} onChangeText={setEditHabText} autoFocus keyboardType="numeric" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarEdicion}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL VER QR */}
      <Modal visible={qrVisible !== null} transparent={true} animationType="slide">
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContainer}>
            <Text style={styles.qrPreviewTitle}>Código QR de Habitación</Text>
            
            <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }}>
              <View style={styles.qrImageWrapper}>
                <Text style={styles.qrImageTitle}>ECO-TAG</Text>
                <Text style={styles.qrImageSub}>Habitación {qrVisible}</Text>
                <QRCode value={`ecotag://habitacion/${qrVisible}`} size={200} color="#1B4D21" backgroundColor="white" />
              </View>
            </ViewShot>

            <View style={styles.qrActions}>
              <TouchableOpacity style={styles.downloadQRButton} onPress={descargarQR}>
                <Text style={styles.downloadQRText}>⬇️ Descargar Imagen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeQRButton} onPress={() => setQrVisible(null)}>
                <Text style={styles.closeQRText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Habitaciones y QR</Text>
      <Text style={styles.subtitulo}>Administra las habitaciones del hotel conectadas a la nube.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚪 Nueva Habitación</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Ej: 501" value={nuevaHab} onChangeText={setNuevaHab} keyboardType="numeric" />
          <TouchableOpacity style={styles.addButton} onPress={agregarHabitacion}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Directorio de Habitaciones</Text>
      
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Buscar habitación..." value={searchHab} onChangeText={setSearchHab} />
      </View>

      {habitacionesFiltradas.length === 0 ? (
        <Text style={styles.emptyText}>No hay habitaciones registradas.</Text>
      ) : (
        habitacionesFiltradas.map((hab, index) => (
          <View key={hab.id} style={styles.habItem}>
            <View style={styles.habInfo}>
              <Text style={styles.habText}>Habitación {hab.numero_habitacion}</Text>
              <Text style={styles.habSubText}>QR: {hab.qr_uid}</Text>
            </View>
            <View style={styles.habActions}>
              <TouchableOpacity onPress={() => abrirEdicion(hab, index)} style={styles.iconButton}>
                <Text style={styles.iconText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => borrarHabitacion(hab.id, hab.numero_habitacion)} style={styles.iconButton}>
                <Text style={styles.iconText}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrButton} onPress={() => setQrVisible(hab.numero_habitacion)}>
                <Text style={styles.qrButtonText}>Ver QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ... (Mantén exactamente los mismos estilos que ya tenías en la pantalla)
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#1565C0', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#0D47A1', marginBottom: 5 },
  subtitulo: { fontSize: 14, color: '#546E7A', marginBottom: 25 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, marginRight: 10 },
  addButton: { backgroundColor: '#1565C0', width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  searchContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', marginBottom: 15 },
  searchIcon: { fontSize: 16, marginRight: 5 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#333' },
  habItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  habInfo: { flex: 1 },
  habText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  habSubText: { fontSize: 12, color: '#888', marginTop: 3 },
  habActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 5, marginRight: 5 },
  iconText: { fontSize: 16 },
  qrButton: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 5 },
  qrButtonText: { color: '#1565C0', fontWeight: 'bold', fontSize: 12 },
  emptyText: { textAlign: 'center', color: '#999', fontStyle: 'italic', padding: 10 },
  qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  qrModalContainer: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  qrPreviewTitle: { fontSize: 22, fontWeight: 'bold', color: '#0D47A1', marginBottom: 20 },
  qrImageWrapper: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#1B4D21' },
  qrImageTitle: { fontSize: 24, fontWeight: '900', color: '#1B4D21', marginBottom: 5, letterSpacing: 2 },
  qrImageSub: { fontSize: 16, color: '#333', marginBottom: 15 },
  qrActions: { flexDirection: 'row', marginTop: 25, width: '100%', justifyContent: 'space-between' },
  downloadQRButton: { flex: 1, backgroundColor: '#1B4D21', padding: 15, borderRadius: 10, alignItems: 'center', marginRight: 10 },
  downloadQRText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  closeQRButton: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 10, alignItems: 'center', width: 100, borderWidth: 1, borderColor: '#E0E0E0' },
  closeQRText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '80%', padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  modalInput: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelButton: { padding: 10, marginRight: 10 },
  cancelText: { color: '#666', fontWeight: 'bold', fontSize: 16 },
  saveButton: { backgroundColor: '#1565C0', padding: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});