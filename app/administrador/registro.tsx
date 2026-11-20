import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../conexion/supabase';
import { obtenerIdHotel } from '../../conexion/sesion'; // IMPORTANTE
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function Registro() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'registrar' | 'gestionar'>('registrar');
  const [cargando, setCargando] = useState(true);

  // Catálogos
  const [tiposPrenda, setTiposPrenda] = useState<any[]>([]);
  const [composiciones, setComposiciones] = useState<any[]>([]);

  // Lista de prendas ya registradas
  const [prendas, setPrendas] = useState<any[]>([]);
  const [searchPrenda, setSearchPrenda] = useState('');

  // Formulario
  const [tipo, setTipo] = useState('');
  const [composicion, setComposicion] = useState('');
  const [codigoNFC, setCodigoNFC] = useState('');
  const [prendaAEliminar, setPrendaAEliminar] = useState<any>(null);

  // Modales
  const [modalVisible, setModalVisible] = useState<'tipo' | 'composicion' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);

  // NFC
  const [isScanning, setIsScanning] = useState(false);

  // Se ejecuta cada vez que entras a la pantalla
  useFocusEffect(
    useCallback(() => {
      cargarCatalogos();
      cargarPrendas();
    }, [])
  );

  // --- 1. CARGAR CATÁLOGOS DEL HOTEL ---
  const cargarCatalogos = async () => {
    const idHotel = await obtenerIdHotel();
    if (!idHotel) return;

    const { data: dataTipos } = await supabase.from('tipos_prenda').select('*').eq('id_hotel', idHotel).order('nombre');
    const { data: dataComps } = await supabase.from('tipos_tela').select('*').eq('id_hotel', idHotel).order('nombre');

    if (dataTipos) setTiposPrenda(dataTipos);
    if (dataComps) setComposiciones(dataComps);
  };

  // --- 2. CARGAR PRENDAS REGISTRADAS ---
  const cargarPrendas = async () => {
    setCargando(true);
    const idHotel = await obtenerIdHotel();
    if (!idHotel) { setCargando(false); return; }

    const { data } = await supabase
      .from('articulos')
      .select('*')
      .eq('estado', 'Disponible')
      .eq('id_hotel', idHotel) // Filtro por hotel
      .order('created_at', { ascending: false });

    setPrendas(data || []);
    setCargando(false);
  };

  // --- 3. ESCANEAR NFC ---
  const escanearNFC = async () => {
    setIsScanning(true);
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        const idEscaneado = tag.id.toUpperCase();
        // Verificamos si ya existe en este hotel
        const existe = prendas.find(p => p.nfc_uid === idEscaneado);
        if (existe) {
          Alert.alert("Error", "Este código NFC ya está registrado.");
        } else {
          setCodigoNFC(idEscaneado);
          Alert.alert("✅ NFC Leído", `Código capturado: ${idEscaneado}`);
        }
      }
    } catch (ex) {
      Alert.alert("Error", "No se pudo leer el chip NFC.");
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      setIsScanning(false);
    }
  };

  // --- 4. GUARDAR PRENDA ---
  const guardarPrenda = async () => {
    if (!tipo || !composicion || !codigoNFC) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios.");
      return;
    }

    const idHotel = await obtenerIdHotel();
    const compSeleccionada = composiciones.find(c => c.nombre === composicion);

    // Insertamos el artículo
    const { data: nuevaPrenda, error } = await supabase
      .from('articulos')
      .insert([{ 
        nfc_uid: codigoNFC.toUpperCase(), 
        tipo_prenda: tipo, 
        id_tipo_tela: compSeleccionada ? compSeleccionada.id : null,
        estado: 'Disponible',
        lavados_totales: 0,
        vida_util_max: 200,
        id_hotel: idHotel // <-- GUARDAMOS EL HOTEL
      }])
      .select()
      .single();

    if (error) {
      Alert.alert("Error al guardar", error.message);
    } else {
      // Guardamos el registro en el historial
      if (nuevaPrenda) {
        await supabase.from('historial').insert([{
          id_articulo: nuevaPrenda.id,
          evento: 'Registro de Prenda',
          detalle: `Registrada en el almacén como ${tipo}.`,
          id_hotel: idHotel
        }]);
      }

      Alert.alert("¡Éxito!", `Prenda registrada:\n${tipo}`);
      setTipo(''); setComposicion(''); setCodigoNFC('');
      cargarPrendas();
      setActiveTab('gestionar');
    }
  };

  // --- 5. DAR DE BAJA ---
  const confirmarBaja = async () => {
    if (!prendaAEliminar) return;
    const idHotel = await obtenerIdHotel();

    // En lugar de borrar, actualizamos el estado a "Perdida" para no perder el historial
    const { error } = await supabase
      .from('articulos')
      .update({ estado: 'Perdida' })
      .eq('id', prendaAEliminar.id);

    if (error) Alert.alert("Error", error.message);
    else {
      await supabase.from('historial').insert([{
        id_articulo: prendaAEliminar.id,
        evento: 'Baja de Prenda',
        detalle: 'El administrador dio de baja la prenda.',
        id_hotel: idHotel
      }]);
      Alert.alert("Prenda dada de baja", "La prenda se movió a 'Perdidas'.");
      cargarPrendas();
    }
    setModalDeleteVisible(false);
    setPrendaAEliminar(null);
  };

  const renderModalSelect = () => {
    let data: any[] = [];
    let title = '';
    let setter: (val: string) => void = () => {};

    if (modalVisible === 'tipo') { data = tiposPrenda; title = 'Tipo de Prenda'; setter = setTipo; }
    if (modalVisible === 'composicion') { data = composiciones; title = 'Composición'; setter = setComposicion; }

    const dataFiltrada = data.filter(item => item.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <Modal visible={modalVisible !== null} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar {title}</Text>
            <TextInput style={styles.modalSearchInput} placeholder="Buscar..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} />
            <FlatList
              data={dataFiltrada}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setter(item.nombre); setModalVisible(null); setSearchQuery(''); }}>
                  <Text style={styles.modalItemText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setModalVisible(null); setSearchQuery(''); }}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const prendasFiltradas = prendas.filter(p => 
    p.nfc_uid.toLowerCase().includes(searchPrenda.toLowerCase()) || 
    p.tipo_prenda.toLowerCase().includes(searchPrenda.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderModalSelect()}

      {/* MODAL ESCANEANDO NFC */}
      <Modal visible={isScanning} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color="#1B4D21" />
            <Text style={styles.scanningTitle}>Escaneando Chip NFC...</Text>
            <Text style={styles.scanningText}>Acerca el chip a la parte trasera del celular.</Text>
            <TouchableOpacity style={styles.cancelScanBtn} onPress={() => { NfcManager.cancelTechnologyRequest(); setIsScanning(false); }}>
              <Text style={styles.cancelScanText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DAR DE BAJA */}
      <Modal visible={modalDeleteVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.guideModalBox}>
            <Text style={styles.guideTitle}>¿Dar de baja?</Text>
            <Text style={styles.guideText}>La prenda {prendaAEliminar?.tipo_prenda} pasará a la lista de "Perdidas" para mantener su historial.</Text>
            <View style={styles.guideButtonsRow}>
              <TouchableOpacity style={styles.guideCancelBtn} onPress={() => setModalDeleteVisible(false)}><Text style={styles.guideCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.guideActionBtn} onPress={confirmarBaja}><Text style={styles.guideActionText}>Sí, dar de baja</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: '#EEE' }]} placeholder="Escanea para obtener el ID" placeholderTextColor="#999" value={codigoNFC} editable={false} />
              <TouchableOpacity style={styles.nfcButton} onPress={escanearNFC}>
                <Text style={styles.nfcButtonText}>📡 Escanear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.botonGuardar} onPress={guardarPrenda}>
            <Text style={styles.textoBoton}>Guardar en Nube</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'gestionar' && (
        <View>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Buscar por NFC o tipo..." placeholderTextColor="#999" value={searchPrenda} onChangeText={setSearchPrenda} />
          </View>

          <Text style={styles.infoText}>Mostrando prendas Disponibles en el inventario ({prendasFiltradas.length}).</Text>

          {cargando ? (
             <ActivityIndicator size="large" color="#1B4D21" style={{ marginTop: 20 }} />
          ) : prendasFiltradas.length === 0 ? (
             <View style={styles.emptyState}>
               <Text style={styles.emptyIcon}>📦</Text>
               <Text style={styles.emptyText}>No hay prendas disponibles.</Text>
             </View>
          ) : (
            prendasFiltradas.map((prenda) => (
              <View key={prenda.id} style={styles.prendaCard}>
                <View style={styles.prendaHeader}>
                  <Text style={styles.prendaId}>{prenda.nfc_uid}</Text>
                  <View style={styles.estadoBadge}>
                    <Text style={styles.estadoText}>{prenda.estado}</Text>
                  </View>
                </View>
                <Text style={styles.prendaNombre}>{prenda.tipo_prenda}</Text>
                
                <TouchableOpacity style={styles.deleteBtn} onPress={() => { setPrendaAEliminar(prenda); setModalDeleteVisible(true); }}>
                  <Text style={styles.deleteBtnText}>🗑️ Dar de baja prenda</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

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
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#1B4D21', marginBottom: 20 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 10, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: '#1B4D21' },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  selectInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between' },
  selectText: { fontSize: 16, color: '#333' },
  selectPlaceholder: { fontSize: 16, color: '#999' },
  arrow: { fontSize: 12, color: '#999' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, fontSize: 16, color: '#333' },
  nfcRow: { flexDirection: 'row', alignItems: 'center' },
  nfcButton: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 10, marginLeft: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  nfcButtonText: { color: '#1B4D21', fontWeight: 'bold' },
  botonGuardar: { backgroundColor: '#1B4D21', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  searchContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 10 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  infoText: { fontSize: 12, color: '#666', marginBottom: 15, fontStyle: 'italic' },
  prendaCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  prendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  prendaId: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  estadoBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  estadoText: { fontSize: 11, fontWeight: 'bold', color: '#2E7D32' },
  prendaNombre: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  deleteBtn: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, alignItems: 'center' },
  deleteBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  emptyState: { alignItems: 'center', marginTop: 30, padding: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 10, opacity: 0.5 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14 },
  
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  modalSearchInput: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 15 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalItemText: { fontSize: 16, textAlign: 'center' },
  modalClose: { marginTop: 15, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { color: '#D32F2F', fontWeight: 'bold' },

  modalOverlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanningBox: { backgroundColor: '#FFF', width: '85%', padding: 30, borderRadius: 20, alignItems: 'center' },
  scanningTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B4D21', marginTop: 20, marginBottom: 10 },
  scanningText: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 25 },
  cancelScanBtn: { padding: 15, backgroundColor: '#FFEBEE', borderRadius: 10, width: '100%', alignItems: 'center' },
  cancelScanText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
  
  guideModalBox: { backgroundColor: '#FFF', width: '85%', padding: 25, borderRadius: 16, alignItems: 'center' },
  guideTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B4D21', marginBottom: 15 },
  guideText: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  guideButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  guideCancelBtn: { flex: 1, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  guideCancelText: { color: '#555', fontWeight: 'bold' },
  guideActionBtn: { flex: 1, backgroundColor: '#D32F2F', padding: 15, borderRadius: 10, alignItems: 'center' },
  guideActionText: { color: '#FFF', fontWeight: 'bold' },
});