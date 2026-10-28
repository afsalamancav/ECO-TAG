import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const INITIAL_HABS = ['301', '302', '305', '401', '402'];

export default function GestionHabitaciones() {
  const router = useRouter();
  
  const [habitaciones, setHabitaciones] = useState(INITIAL_HABS);
  const [nuevaHab, setNuevaHab] = useState('');
  const [searchHab, setSearchHab] = useState('');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editHabText, setEditHabText] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Estado para la vista previa del QR
  const [qrVisible, setQrVisible] = useState<string | null>(null);
  const viewShotRef = useRef<any>(null);

  const agregarHabitacion = () => {
    if (!nuevaHab.trim()) return;
    if (habitaciones.includes(nuevaHab.trim())) {
      Alert.alert("Error", "Esta habitación ya existe.");
      return;
    }
    setHabitaciones([...habitaciones, nuevaHab.trim()]);
    setNuevaHab('');
  };

  const borrarHabitacion = (hab: string) => {
    Alert.alert(
      "Eliminar Habitación",
      `¿Seguro que deseas eliminar la habitación ${hab}? Su código QR dejará de funcionar.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => {
            setHabitaciones(habitaciones.filter(h => h !== hab));
        }}
      ]
    );
  };

  const abrirEdicion = (hab: string, index: number) => {
    setEditHabText(hab);
    setEditIndex(index);
    setEditModalVisible(true);
  };

  const guardarEdicion = () => {
    if (!editHabText.trim() || editIndex === null) return;
    const nuevas = [...habitaciones];
    nuevas[editIndex] = editHabText.trim();
    setHabitaciones(nuevas);
    setEditModalVisible(false);
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

  const habitacionesFiltradas = habitaciones.filter(h => h.toLowerCase().includes(searchHab.toLowerCase()));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL DE EDICIÓN */}
      <Modal visible={editModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar Habitación</Text>
            <TextInput style={styles.modalInput} value={editHabText} onChangeText={setEditHabText} autoFocus />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarEdicion}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE VISTA PREVIA DEL QR */}
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
      <Text style={styles.subtitulo}>Administra las habitaciones del hotel y sus códigos de acceso.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚪 Nueva Habitación</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Ej: 501" value={nuevaHab} onChangeText={setNuevaHab} />
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
        <Text style={styles.emptyText}>No se encontraron habitaciones.</Text>
      ) : (
        habitacionesFiltradas.map((hab) => {
          const originalIndex = habitaciones.indexOf(hab);
          return (
            <View key={hab} style={styles.habItem}>
              <View style={styles.habInfo}>
                <Text style={styles.habText}>Habitación {hab}</Text>
                <Text style={styles.habSubText}>Archivo: HAB_{hab}_QR.jpg</Text>
              </View>
              <View style={styles.habActions}>
                <TouchableOpacity onPress={() => abrirEdicion(hab, originalIndex)} style={styles.iconButton}>
                  <Text style={styles.iconText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => borrarHabitacion(hab)} style={styles.iconButton}>
                  <Text style={styles.iconText}>🗑️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.qrButton} onPress={() => setQrVisible(hab)}>
                  <Text style={styles.qrButtonText}>Ver QR</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  
  // Estilos del modal de Edición
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '80%', padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  modalInput: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelButton: { padding: 10, marginRight: 10 },
  cancelText: { color: '#666', fontWeight: 'bold', fontSize: 16 },
  saveButton: { backgroundColor: '#1565C0', padding: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // NUEVOS ESTILOS PARA EL MODAL DEL QR
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
});