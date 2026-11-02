import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../conexion/supabase';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function Registro() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'registrar' | 'gestionar'>('registrar');
  const [tiposPrenda, setTiposPrenda] = useState<any[]>([]);
  const [composiciones, setComposiciones] = useState<any[]>([]);
  const [prendas, setPrendas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Formulario
  const [tipo, setTipo] = useState('');
  const [composicion, setComposicion] = useState('');
  const [codigoNFC, setCodigoNFC] = useState('');
  const [modalVisible, setModalVisible] = useState<'tipo' | 'composicion' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPrenda, setSearchPrenda] = useState('');

  // Estados para el NFC y Escaneo
  const [isScanning, setIsScanning] = useState(false);
  const [scanContext, setScanContext] = useState<'registrar' | 'borrar' | 'copiar' | null>(null);

  // Editar
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTipo, setEditTipo] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editModalSelectVisible, setEditModalSelectVisible] = useState(false);

  useEffect(() => {
    NfcManager.start();
    cargarCatalogos();
    cargarPrendas();
    return () => { NfcManager.cancelTechnologyRequest().catch(() => 0); };
  }, []);

  const cargarCatalogos = async () => {
    const { data: dataTipos } = await supabase.from('tipos_prenda').select('*').order('nombre');
    const { data: dataComps } = await supabase.from('tipos_tela').select('*').order('nombre');
    if (dataTipos) setTiposPrenda(dataTipos);
    if (dataComps) setComposiciones(dataComps);
  };

  const cargarPrendas = async () => {
    setCargando(true);
    const { data } = await supabase.from('articulos').select('*').eq('estado', 'Disponible').order('created_at', { ascending: false });
    setPrendas(data || []);
    setCargando(false);
  };

  // --- LÓGICA DE ESCANEO ---
  const iniciarEscaneo = async (contexto: 'registrar' | 'borrar' | 'copiar') => {
    setScanContext(contexto);
    setIsScanning(true);
    setCodigoNFC(''); 

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag && tag.id) {
        const idEscaneado = tag.id.toUpperCase();
        
        if (contexto === 'registrar') {
          setCodigoNFC(idEscaneado);
          Alert.alert("✅ NFC Leído", `Código capturado: ${idEscaneado}`);
        } else if (contexto === 'borrar') {
          const existe = prendas.find(p => p.nfc_uid === idEscaneado);
          if (existe) pedirConfirmacionBaja(existe);
          else Alert.alert("No encontrado", "Este chip no está registrado en la base de datos.");
        } else if (contexto === 'copiar') {
          // CAMBIO: En lugar de usar Clipboard, mostramos una alerta con el ID formateado para copiar manual.
          Alert.alert(
            "📋 ID del Chip",
            `El ID de este chip es:\n\n${idEscaneado}\n\n(Puedes mantener presionado para copiarlo)`,
            [{ text: "Cerrar" }]
          );
        }
      }
    } catch (ex) {
      console.log("Error NFC:", ex);
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
      setIsScanning(false);
    }
  };

  // --- GUARDAR PRENDA ---
  const guardarPrenda = async () => {
    if (!tipo || !composicion || !codigoNFC) {
      Alert.alert("Error", "Completa todos los campos.");
      return;
    }

    const compSeleccionada = composiciones.find(c => c.nombre === composicion);

    const { error } = await supabase.from('articulos').insert([
      { 
        nfc_uid: codigoNFC.toUpperCase(), 
        tipo_prenda: tipo, 
        id_tipo_tela: compSeleccionada ? compSeleccionada.id : null,
        estado: 'Disponible',
        lavados_totales: 0
      }
    ]);

    if (error) Alert.alert("Error al guardar", error.message);
    else {
      Alert.alert("¡Éxito!", `Prenda registrada:\n${tipo}`);
      setTipo(''); setComposicion(''); setCodigoNFC('');
      cargarPrendas();
      setActiveTab('gestionar');
    }
  };

  // --- EDITAR PRENDA ---
  const abrirEdicion = (prenda: any) => {
    setEditId(prenda.id);
    setEditTipo(prenda.tipo_prenda);
    setEditCodigo(prenda.nfc_uid);
    setEditModalVisible(true);
  };

  const guardarEdicion = async () => {
    if (!editId) return;
    const { error } = await supabase
      .from('articulos')
      .update({ tipo_prenda: editTipo, nfc_uid: editCodigo })
      .eq('id', editId);

    if (error) Alert.alert("Error", error.message);
    else {
      setEditModalVisible(false);
      cargarPrendas();
    }
  };

  // --- BORRAR ---
  const pedirConfirmacionBaja = (prenda: any) => {
    Alert.alert(
      "Dar de baja",
      `¿Estás seguro de eliminar ${prenda.tipo_prenda} (${prenda.nfc_uid})?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: async () => {
          const { error } = await supabase.from('articulos').delete().eq('id', prenda.id);
          if (error) Alert.alert("Error", "No se puede borrar.");
          else { cargarPrendas(); Alert.alert("Eliminada", "Prenda borrada del sistema."); }
        }}
      ]
    );
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

  // Filtro para buscar por nombre o por ID de NFC
  const prendasFiltradas = prendas.filter(p => 
    p.nfc_uid.toLowerCase().includes(searchPrenda.toLowerCase()) || 
    p.tipo_prenda.toLowerCase().includes(searchPrenda.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderModalSelect()}

      {/* PANTALLA DE ESCANEANDO */}
      <Modal visible={isScanning} transparent={true} animationType="fade">
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningBox}>
            <ActivityIndicator size="large" color="#1B4D21" />
            <Text style={styles.scanningTitle}>Escaneando Chip NFC...</Text>
            <Text style={styles.scanningText}>
              1. Retira la funda del celular.{"\n"}
              2. Acerca el chip a la parte trasera (centro superior).{"\n"}
              3. Mantenlo pegado hasta que vibre.
            </Text>
            <TouchableOpacity style={styles.cancelScanBtn} onPress={() => { NfcManager.cancelTechnologyRequest(); setIsScanning(false); }}>
              <Text style={styles.cancelScanText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR PRENDA */}
      <Modal visible={editModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainerCenter}>
          <View style={styles.editBox}>
            <Text style={styles.modalTitle}>Editar Prenda</Text>
            
            <Text style={styles.label}>NFC UID</Text>
            <TextInput style={styles.inputBlock} value={editCodigo} onChangeText={setEditCodigo} editable={false} />

            <Text style={styles.label}>Tipo de Prenda</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setEditModalSelectVisible(true)}>
              <Text style={styles.selectText}>{editTipo}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <View style={styles.guideButtonsRow}>
              <TouchableOpacity style={styles.guideCancelBtn} onPress={() => setEditModalVisible(false)}><Text style={styles.guideCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.guideActionBtn} onPress={guardarEdicion}><Text style={styles.guideActionText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL PARA ELEGIR TIPO DE PRENDA EN EDITAR */}
      <Modal visible={editModalSelectVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Tipo</Text>
            <FlatList
              data={tiposPrenda}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setEditTipo(item.nombre); setEditModalSelectVisible(false); }}>
                  <Text style={styles.modalItemText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setEditModalSelectVisible(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/administrador/textiles')}>
          <Text style={styles.linkText}>⚙️ Catálogo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.titulo}>Gestión de Textiles</Text>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'registrar' && styles.tabActive]} onPress={() => setActiveTab('registrar')}>
          <Text style={[styles.tabText, activeTab === 'registrar' && styles.tabTextActive]}>Registrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'gestionar' && styles.tabActive]} onPress={() => setActiveTab('gestionar')}>
          <Text style={[styles.tabText, activeTab === 'gestionar' && styles.tabTextActive]}>Gestionar</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'registrar' && (
        <View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tipo de Prenda *</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setModalVisible('tipo')}>
              <Text style={tipo ? styles.selectText : styles.selectPlaceholder}>{tipo || 'Seleccionar...'}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Composición *</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setModalVisible('composicion')}>
              <Text style={composicion ? styles.selectText : styles.selectPlaceholder}>{composicion || 'Seleccionar...'}</Text>
              <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Código NFC *</Text>
            <TextInput style={styles.inputBlock} placeholder="El ID aparecerá aquí" placeholderTextColor="#999" value={codigoNFC} editable={false} />
            
            <TouchableOpacity style={styles.btnScanFull} onPress={() => iniciarEscaneo('registrar')}>
              <Text style={styles.btnScanFullText}>📡 Escanear Chip NFC</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.botonGuardar} onPress={guardarPrenda}>
            <Text style={styles.textoBoton}>Guardar en Nube</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'gestionar' && (
        <View>
          {/* BOTÓN PARA IDENTIFICAR Y MOSTRAR ID */}
          <TouchableOpacity style={styles.btnScanCopy} onPress={() => iniciarEscaneo('copiar')}>
            <Text style={styles.btnScanFullText}>📡 Identificar ID de Chip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnScanFullDanger} onPress={() => iniciarEscaneo('borrar')}>
            <Text style={styles.btnScanFullText}>📡 Escanear Chip para Eliminar</Text>
          </TouchableOpacity>

          <TextInput 
            style={styles.inputBlock} 
            placeholder="Buscar por nombre o NFC UID..." 
            placeholderTextColor="#999" 
            value={searchPrenda} 
            onChangeText={setSearchPrenda} 
          />

          {prendasFiltradas.map((prenda) => (
            <View key={prenda.id} style={styles.prendaCard}>
              <Text style={styles.prendaId}>{prenda.nfc_uid}</Text>
              <Text style={styles.prendaNombre}>{prenda.tipo_prenda}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => abrirEdicion(prenda)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>✏️ Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => pedirConfirmacionBaja(prenda)} style={styles.actionBtn}>
                  <Text style={[styles.actionBtnText, {color: '#D32F2F'}]}>🗑️ Borrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ... (los estilos se mantienen exactamente igual que en la respuesta anterior)
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
  selectInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  selectText: { fontSize: 16, color: '#333' },
  selectPlaceholder: { fontSize: 16, color: '#999' },
  arrow: { fontSize: 12, color: '#999' },
  inputBlock: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, fontSize: 16, color: '#333', marginBottom: 10 },
  
  btnScanFull: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BBDEFB' },
  btnScanCopy: { backgroundColor: '#F3E5F5', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E1BEE7', marginBottom: 10 },
  btnScanFullDanger: { backgroundColor: '#FFEBEE', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2', marginBottom: 15 },
  btnScanFullText: { color: '#0D47A1', fontWeight: 'bold', fontSize: 16 },

  botonGuardar: { backgroundColor: '#1B4D21', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  textoBoton: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  prendaCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  prendaId: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  prendaNombre: { fontSize: 18, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  actionBtn: { padding: 5 },
  actionBtnText: { fontWeight: 'bold', color: '#1565C0' },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  modalSearchInput: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 15 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalItemText: { fontSize: 16, textAlign: 'center' },
  modalClose: { marginTop: 15, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { color: '#D32F2F', fontWeight: 'bold' },

  modalContainerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  
  scanningOverlay: { flex: 1, backgroundColor: 'rgba(27, 77, 33, 0.95)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  scanningBox: { backgroundColor: '#FFF', width: '100%', padding: 30, borderRadius: 20, alignItems: 'center' },
  scanningTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B4D21', marginTop: 20, marginBottom: 15 },
  scanningText: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  cancelScanBtn: { padding: 15, backgroundColor: '#FFEBEE', borderRadius: 10, width: '100%', alignItems: 'center' },
  cancelScanText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },

  editBox: { backgroundColor: '#FFF', width: '85%', padding: 25, borderRadius: 16, elevation: 5 },
  guideButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  guideCancelBtn: { flex: 1, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  guideCancelText: { color: '#555', fontWeight: 'bold' },
  guideActionBtn: { flex: 1, backgroundColor: '#1B4D21', padding: 15, borderRadius: 10, alignItems: 'center' },
  guideActionText: { color: '#FFF', fontWeight: 'bold' },
});