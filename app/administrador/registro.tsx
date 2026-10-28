import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const TIPOS_PRENDA = ['Sábana Queen', 'Sábana King', 'Funda de almohada', 'Toalla de baño', 'Toalla de manos', 'Almohada', 'Bata de baño'];
const COMPOSICIONES = ['100% Algodón', '50% Algodón / 50% Poliéster', '100% Poliéster', '60% Algodón / 40% Tencel', '100% Microfibra'];

const INITIAL_PRENDAS = [
  { id: 'NFC-001', tipo: 'Sábana Queen', comp: '100% Algodón', estado: 'En Almacén' },
  { id: 'NFC-002', tipo: 'Toalla de baño', comp: '100% Microfibra', estado: 'En Almacén' },
  { id: 'NFC-003', tipo: 'Sábana King', comp: '50% Algodón / 50% Poliéster', estado: 'En Habitación 305' },
  { id: 'NFC-004', tipo: 'Funda de almohada', comp: '100% Algodón', estado: 'En Lavandería' },
];

export default function Registro() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'registrar' | 'gestionar'>('registrar');

  const [tipo, setTipo] = useState('');
  const [composicion, setComposicion] = useState('');
  const [codigoNFC, setCodigoNFC] = useState('');
  const [modalVisible, setModalVisible] = useState<'tipo' | 'composicion' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [prendas, setPrendas] = useState(INITIAL_PRENDAS);
  const [searchPrenda, setSearchPrenda] = useState('');
  const [prendaAEliminar, setPrendaAEliminar] = useState<any>(null);

  const guardarPrenda = () => {
    if (!tipo || !composicion || !codigoNFC) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios.");
      return;
    }
    const nueva = { id: codigoNFC.toUpperCase(), tipo, comp: composicion, estado: 'En Almacén' };
    setPrendas([nueva, ...prendas]);
    Alert.alert("¡Éxito!", `Prenda registrada en el inventario:\n${tipo}`);
    setTipo(''); setComposicion(''); setCodigoNFC('');
    setActiveTab('gestionar');
  };

  const simularEscaneoBaja = () => {
    Alert.alert(
      "📡 Leyendo NFC...",
      "Acerca el dispositivo a la etiqueta de la prenda que deseas dar de baja.",
      [{ text: "Simular Lectura (Buscar NFC-003)", onPress: () => {
        const prendaEncontrada = prendas.find(p => p.id === 'NFC-003');
        if (prendaEncontrada) {
          if (prendaEncontrada.estado !== 'En Almacén') {
            Alert.alert("Acción Denegada", `La prenda ${prendaEncontrada.id} no se puede dar de baja porque actualmente está "${prendaEncontrada.estado}". Solo se pueden eliminar prendas que estén en el almacén.`);
          } else {
            setPrendaAEliminar(prendaEncontrada);
          }
        }
      }}, 
      { text: "Simular Lectura (Buscar NFC-001)", onPress: () => {
        const prendaEncontrada = prendas.find(p => p.id === 'NFC-001');
        if (prendaEncontrada) setPrendaAEliminar(prendaEncontrada);
      }},
      { text: "Cancelar", style: "cancel" }]
    );
  };

  const confirmarBaja = () => {
    if (!prendaAEliminar) return;
    setPrendas(prendas.filter(p => p.id !== prendaAEliminar.id));
    setPrendaAEliminar(null);
    Alert.alert("Prenda dada de baja", "El textil ha sido eliminado del inventario.");
  };

  const renderModal = () => {
    let data: string[] = [];
    let title = '';
    let setter: (val: string) => void = () => {};

    if (modalVisible === 'tipo') { data = TIPOS_PRENDA; title = 'Tipo de Prenda'; setter = setTipo; }
    if (modalVisible === 'composicion') { data = COMPOSICIONES; title = 'Composición'; setter = setComposicion; }

    const dataFiltrada = data.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <Modal visible={modalVisible !== null} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar {title}</Text>
            
            <View style={styles.modalSearchContainer}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              {/* AQUÍ QUITAMOS EL autoFocus */}
              <TextInput 
                style={styles.modalSearchInput} 
                placeholder="Escribe para filtrar..." 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
            </View>
            
            <FlatList
              data={dataFiltrada}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setter(item); setModalVisible(null); setSearchQuery(''); }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron resultados.</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setModalVisible(null); setSearchQuery(''); }}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const prendasEnAlmacen = prendas.filter(p => 
    p.estado === 'En Almacén' && 
    (p.id.toLowerCase().includes(searchPrenda.toLowerCase()) || p.tipo.toLowerCase().includes(searchPrenda.toLowerCase()))
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderModal()}

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
          <Text style={styles.backText}>← Volver al Panel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/administrador/textiles')}>
          <Text style={styles.linkText}>⚙️ Catálogo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.titulo}>Gestión de Textiles</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'registrar' && styles.tabActive]} onPress={() => setActiveTab('registrar')}>
          <Text style={[styles.tabText, activeTab === 'registrar' && styles.tabTextActive]}>Registrar Nuevo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'gestionar' && styles.tabActive]} onPress={() => setActiveTab('gestionar')}>
          <Text style={[styles.tabText, activeTab === 'gestionar' && styles.tabTextActive]}>Dar de Baja</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'registrar' && (
        <View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tipo de Prenda *</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setModalVisible('tipo')}>
              <Text style={tipo ? styles.selectText : styles.selectPlaceholder}>{tipo || 'Selecciona una opción...'}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Composición *</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setModalVisible('composicion')}>
              <Text style={composicion ? styles.selectText : styles.selectPlaceholder}>{composicion || 'Selecciona una opción...'}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Código NFC Único *</Text>
            <View style={styles.nfcRow}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Ej: 04:A2:3F:11" value={codigoNFC} onChangeText={setCodigoNFC} />
              <TouchableOpacity style={styles.nfcButton} onPress={() => Alert.alert("Simulación", "Lector NFC activo.")}>
                <Text style={styles.nfcButtonText}>📡 Leer</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.botonGuardar} onPress={guardarPrenda}>
            <Text style={styles.textoBoton}>Guardar en Almacén</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'gestionar' && (
        <View>
          <TouchableOpacity style={styles.scanBajaButton} onPress={simularEscaneoBaja}>
            <Text style={styles.scanBajaText}>📡 Escanear NFC para dar de baja</Text>
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Buscar en almacén..." value={searchPrenda} onChangeText={setSearchPrenda} />
          </View>

          <Text style={styles.infoText}>Mostrando solo prendas disponibles en el almacén ({prendasEnAlmacen.length}).</Text>

          {prendasEnAlmacen.length === 0 ? (
             <View style={styles.emptyState}>
               <Text style={styles.emptyIcon}>📦</Text>
               <Text style={styles.emptyText}>No hay prendas en el almacén que coincidan con la búsqueda.</Text>
             </View>
          ) : (
            prendasEnAlmacen.map((prenda) => (
              <View key={prenda.id} style={styles.prendaCard}>
                <View style={styles.prendaHeader}>
                  <Text style={styles.prendaId}>{prenda.id}</Text>
                  <View style={styles.estadoBadge}>
                    <Text style={styles.estadoText}>{prenda.estado}</Text>
                  </View>
                </View>
                <Text style={styles.prendaNombre}>{prenda.tipo}</Text>
                <Text style={styles.prendaComp}>🧵 {prenda.comp}</Text>
                
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setPrendaAEliminar(prenda)}>
                  <Text style={styles.deleteBtnText}>🗑️ Dar de baja prenda</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      <Modal visible={prendaAEliminar !== null} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteIcon}>⚠️</Text>
            <Text style={styles.deleteTitle}>Dar de baja prenda</Text>
            <Text style={styles.deleteMessage}>
              ¿Estás seguro de que deseas eliminar del sistema la prenda <Text style={{fontWeight: 'bold'}}>{prendaAEliminar?.tipo} ({prendaAEliminar?.id})</Text>? 
              Esta acción es irreversible.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setPrendaAEliminar(null)}><Text style={styles.deleteCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmarBaja}><Text style={styles.deleteConfirmText}>Sí, dar de baja</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 5 },
  backText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#1565C0', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21', marginBottom: 20 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 10, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: '#1B4D21' },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  selectInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 16, color: '#333' },
  selectPlaceholder: { fontSize: 16, color: '#999' },
  arrow: { fontSize: 12, color: '#999' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, fontSize: 16, color: '#333' },
  nfcRow: { flexDirection: 'row', alignItems: 'center' },
  nfcButton: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 10, marginLeft: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  nfcButtonText: { color: '#1B4D21', fontWeight: 'bold' },
  botonGuardar: { backgroundColor: '#1B4D21', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  scanBajaButton: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  scanBajaText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
  searchContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 10 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  infoText: { fontSize: 12, color: '#666', marginBottom: 15, fontStyle: 'italic' },
  
  prendaCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0', shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  prendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prendaId: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  estadoBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  estadoText: { fontSize: 11, fontWeight: 'bold', color: '#2E7D32' },

  prendaNombre: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  prendaComp: { fontSize: 14, color: '#666', marginBottom: 15 },
  deleteBtn: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, alignItems: 'center' },
  deleteBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },

  emptyState: { alignItems: 'center', marginTop: 30, padding: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 10, opacity: 0.5 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14 },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
  modalSearchContainer: { flexDirection: 'row', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 15 },
  modalSearchIcon: { fontSize: 18, marginRight: 10 },
  modalSearchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalItemText: { fontSize: 16, color: '#333', textAlign: 'center' },
  modalClose: { marginTop: 15, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },

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
});