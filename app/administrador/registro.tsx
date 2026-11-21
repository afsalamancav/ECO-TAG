import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../conexion/supabase';
import { obtenerIdHotel } from '../../conexion/sesion'; 
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

  // Escaneo NFC
  const [isScanning, setIsScanning] = useState(false);
  const [escaneandoParaBaja, setEscaneandoParaBaja] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarCatalogos();
      cargarPrendas();
    }, [])
  );

  const cargarCatalogos = async () => {
    const idHotel = await obtenerIdHotel();
    if (!idHotel) return;
    const { data: dataTipos } = await supabase.from('tipos_prenda').select('*').eq('id_hotel', idHotel).order('nombre');
    const { data: dataComps } = await supabase.from('tipos_tela').select('*').eq('id_hotel', idHotel).order('nombre');
    if (dataTipos) setTiposPrenda(dataTipos);
    if (dataComps) setComposiciones(dataComps);
  };

  const cargarPrendas = async () => {
    setCargando(true);
    const idHotel = await obtenerIdHotel();
    if (!idHotel) { setCargando(false); return; }

    const { data } = await supabase
      .from('articulos')
      .select('*')
      .eq('estado', 'Disponible')
      .eq('id_hotel', idHotel)
      .order('created_at', { ascending: false });

    setPrendas(data || []);
    setCargando(false);
  };

  const escanearNFC = async (paraBaja: boolean = false) => {
    setEscaneandoParaBaja(paraBaja);
    setIsScanning(true);
    
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        const idEscaneado = tag.id.toUpperCase();
        
        if (paraBaja) {
          const existe = prendas.find(p => p.nfc_uid === idEscaneado);
          if (existe) {
            setPrendaAEliminar(existe);
            setModalDeleteVisible(true);
          } else {
            Alert.alert("No encontrada", "Este chip no está registrado como 'Disponible' en tu hotel.");
          }
        } else {
          // Verificamos si el NFC ya existe en la base de datos
          const idHotel = await obtenerIdHotel();
          const { data } = await supabase
            .from('articulos')
            .select('id')
            .eq('nfc_uid', idEscaneado)
            .eq('id_hotel', idHotel);
            
          if (data && data.length > 0) {
            Alert.alert("Error", "Este código NFC ya está registrado en el sistema.");
          } else {
            setCodigoNFC(idEscaneado);
            Alert.alert("✅ NFC Leído", `Código capturado: ${idEscaneado}`);
          }
        }
      }
    } catch (ex) {
      Alert.alert("Error", "No se pudo leer el chip NFC.");
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      setIsScanning(false);
      setEscaneandoParaBaja(false);
    }
  };

  const guardarPrenda = async () => {
    if (!tipo || !composicion || !codigoNFC) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios.");
      return;
    }

    const idHotel = await obtenerIdHotel();
    const compSeleccionada = composiciones.find(c => c.nombre === composicion);

    // Verificación final para evitar duplicados
    const { data: existe } = await supabase
      .from('articulos')
      .select('id')
      .eq('nfc_uid', codigoNFC.toUpperCase())
      .eq('id_hotel', idHotel);

    if (existe && existe.length > 0) {
      Alert.alert("Error", "Ese código NFC ya está en uso. No se puede registrar.");
      return;
    }

    const { data: nuevaPrenda, error } = await supabase
      .from('articulos')
      .insert([{ 
        nfc_uid: codigoNFC.toUpperCase(), 
        tipo_prenda: tipo, 
        id_tipo_tela: compSeleccionada ? compSeleccionada.id : null,
        estado: 'Disponible',
        lavados_totales: 0,
        vida_util_max: 200,
        id_hotel: idHotel 
      }])
      .select()
      .single();

    if (error) {
      Alert.alert("Error al guardar", error.message);
    } else {
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

    // --- DAR DE BAJA (DELETE REAL) ---
  const confirmarBaja = async () => {
    if (!prendaAEliminar) return;

    try {
      // 1. Primero eliminamos el historial asociado a esta prenda
      const { error: errorHistorial } = await supabase
        .from('historial')
        .delete()
        .eq('id_articulo', prendaAEliminar.id);

      if (errorHistorial) {
        Alert.alert("Error al eliminar historial", errorHistorial.message);
        return; // Detenemos la ejecución si falla el borrado del historial
      }

      // 2. Luego eliminamos la prenda de la tabla articulos
      const { error: errorArticulo } = await supabase
        .from('articulos')
        .delete()
        .eq('id', prendaAEliminar.id);

      if (errorArticulo) {
        Alert.alert("Error al eliminar prenda", errorArticulo.message);
      } else {
        Alert.alert("Prenda Eliminada", "El textil y su historial han sido borrados permanentemente de la base de datos. El chip NFC ahora está libre.");
        cargarPrendas(); // Recargamos la lista para que desaparezca de la vista
      }
    } catch (error: any) {
      Alert.alert("Error inesperado", error.message);
    }
    
    // Cerramos el modal y limpiamos el estado
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
            <Text style={styles.scanningTitle}>
              {escaneandoParaBaja ? 'Escaneando para Dar de Baja...' : 'Escaneando Chip NFC...'}
            </Text>
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
            <Text style={styles.guideTitle}>¿Eliminar prenda?</Text>
            <Text style={styles.guideText}>La prenda <Text style={{fontWeight:'bold'}}>{prendaAEliminar?.tipo_prenda} ({prendaAEliminar?.nfc_uid})</Text> será borrada de la base de datos permanentemente.</Text>
            <View style={styles.guideButtonsRow}>
              <TouchableOpacity style={styles.guideCancelBtn} onPress={() => setModalDeleteVisible(false)}><Text style={styles.guideCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.guideActionBtn} onPress={confirmarBaja}><Text style={styles.guideActionText}>Sí, eliminar</Text></TouchableOpacity>
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
              <TouchableOpacity style={styles.nfcButton} onPress={() => escanearNFC(false)}>
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
          <TouchableOpacity style={styles.btnScanBaja} onPress={() => escanearNFC(true)}>
            <Text style={styles.btnScanBajaText}>📡 Escanear NFC para Dar de Baja</Text>
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="O busca por NFC o tipo..." placeholderTextColor="#999" value={searchPrenda} onChangeText={setSearchPrenda} />
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
  
  btnScanBaja: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  btnScanBajaText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },

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