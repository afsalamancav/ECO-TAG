import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../conexion/supabase';
import { obtenerIdHotel } from '../../conexion/sesion';

const MATERIALES_BASE = ['Algodón', 'Poliéster', 'Tencel', 'Lino', 'Microfibra', 'Elastano', 'Seda', 'Bambú', 'Otro...'];

export default function CatalogoTextil() {
  const router = useRouter();
  const [tiposPrenda, setTiposPrenda] = useState<any[]>([]);
  const [composiciones, setComposiciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Búsquedas
  const [searchTipo, setSearchTipo] = useState('');
  const [searchComp, setSearchComp] = useState('');
  
  // Formulario Tipo de Prenda
  const [nuevoTipo, setNuevoTipo] = useState('');
  
  // Formulario Composición
  const [modalCompVisible, setModalCompVisible] = useState(false);
  const [materialesTemp, setMaterialesTemp] = useState([{ nombre: 'Algodón', porcentaje: '100' }]);
  const [modalMaterialVisible, setModalMaterialVisible] = useState(false);
  const [materialIndexEditando, setMaterialIndexEditando] = useState<number | null>(null);

  // Modales de Edición / Borrado
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItemText, setEditItemText] = useState('');
  const [editContext, setEditContext] = useState<{ tabla: string, id: string } | null>(null);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState<{ tabla: string, id: string, nombre: string } | null>(null);

  useEffect(() => { cargarDatos(); }, []);

  // --- 1. CARGAR DATOS ---
  const cargarDatos = async () => {
    setCargando(true);
    const idHotel = await obtenerIdHotel();
    if (!idHotel) { setCargando(false); return; }

    const { data: dataTipos } = await supabase.from('tipos_prenda').select('*').eq('id_hotel', idHotel).order('nombre');
    const { data: dataComps } = await supabase.from('tipos_tela').select('*').eq('id_hotel', idHotel).order('nombre');

    if (dataTipos) setTiposPrenda(dataTipos);
    if (dataComps) setComposiciones(dataComps);
    setCargando(false);
  };

  // --- 2. CREAR TIPO DE PRENDA ---
  const agregarTipo = async () => {
    if (!nuevoTipo.trim()) return;
    const idHotel = await obtenerIdHotel();
    
    const { error } = await supabase.from('tipos_prenda').insert([{ 
      nombre: nuevoTipo.trim(), 
      id_hotel: idHotel 
    }]);

    if (error) {
      Alert.alert("Error", error.message);
    } else { 
      setNuevoTipo(''); 
      cargarDatos(); 
    }
  };

  // --- 3. CREAR COMPOSICIÓN ---
  const actualizarMaterial = (index: number, campo: string, valor: string) => {
    const nuevos = [...materialesTemp];
    (nuevos[index] as any)[campo] = valor;
    setMaterialesTemp(nuevos);
  };

  const seleccionarMaterialBase = (nombre: string) => {
    if (materialIndexEditando === null) return;
    const nuevos = [...materialesTemp];
    nuevos[materialIndexEditando].nombre = nombre;
    setMaterialesTemp(nuevos);
    setModalMaterialVisible(false);
  };

  const guardarComposicion = async () => {
    // 1. Validaciones básicas
    if (materialesTemp.some(m => !m.nombre.trim() || !m.porcentaje.trim())) {
      return Alert.alert("Error", "Todos los materiales deben tener nombre y porcentaje.");
    }

    const suma = materialesTemp.reduce((acc, m) => acc + (parseInt(m.porcentaje) || 0), 0);
    if (suma !== 100) {
      return Alert.alert("Error", `Los porcentajes suman ${suma}%. Deben sumar exactamente 100%.`);
    }

    const idHotel = await obtenerIdHotel();
    if (!idHotel) {
      return Alert.alert("Error", "No se ha detectado el hotel. Reinicia la app.");
    }

    const nombreCompuesto = materialesTemp.map(m => `${m.porcentaje}% ${m.nombre}`).join(' / ');

    // 2. Inserción en Supabase
    const { error } = await supabase.from('tipos_tela').insert([{ 
      nombre: nombreCompuesto, 
      impacto_ambiental: 'Medio', 
      recomendacion: 'Lavar según instrucciones del fabricante.', 
      alternativa_sostenible: 'Consultar alternativas.',
      id_hotel: idHotel 
    }]);

    if (error) {
      console.error("Error al guardar composición:", error);
      Alert.alert("Error al guardar", error.message);
    } else {
      setModalCompVisible(false);
      setMaterialesTemp([{ nombre: 'Algodón', porcentaje: '100' }]);
      cargarDatos();
    }
  };

  // --- 4. EDITAR Y BORRAR ---
  const abrirEdicion = (tabla: string, id: string, nombreActual: string) => {
    setEditItemText(nombreActual);
    setEditContext({ tabla, id });
    setEditModalVisible(true);
  };

  const guardarEdicion = async () => {
    if (!editItemText.trim() || !editContext) return;
    const { error } = await supabase.from(editContext.tabla).update({ nombre: editItemText.trim() }).eq('id', editContext.id);
    if (error) Alert.alert("Error al editar", error.message);
    else { setEditModalVisible(false); cargarDatos(); }
  };

  const confirmarBorrado = async () => {
    if (!itemAEliminar) return;
    const { error } = await supabase.from(itemAEliminar.tabla).delete().eq('id', itemAEliminar.id);
    if (error) Alert.alert("No se puede borrar", "Puede estar en uso.");
    else cargarDatos();
    setModalDeleteVisible(false);
    setItemAEliminar(null);
  };

  const tiposFiltrados = tiposPrenda.filter(t => t.nombre.toLowerCase().includes(searchTipo.toLowerCase()));
  const compsFiltradas = composiciones.filter(c => c.nombre.toLowerCase().includes(searchComp.toLowerCase()));

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color="#1B4D21" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL SELECCIONAR MATERIAL */}
      <Modal visible={modalMaterialVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.modalContentBottom}>
            <Text style={styles.modalTitle}>Seleccionar Material</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {MATERIALES_BASE.map((mat) => (
                <TouchableOpacity key={mat} style={styles.materialOption} onPress={() => seleccionarMaterialBase(mat)}>
                  <Text style={styles.materialOptionText}>{mat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelButtonBottom} onPress={() => setModalMaterialVisible(false)}>
              <Text style={styles.cancelTextBottom}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR COMPOSICIÓN */}
      <Modal visible={modalCompVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nueva Composición</Text>
            <Text style={styles.modalSub}>La suma debe ser 100%.</Text>
            
            <ScrollView style={{ maxHeight: 300, marginBottom: 15 }}>
              {materialesTemp.map((mat, index) => (
                <View key={index} style={styles.materialRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>Material</Text>
                    <TouchableOpacity style={styles.selectInput} onPress={() => { setMaterialIndexEditando(index); setModalMaterialVisible(true); }}>
                      <Text style={styles.selectText}>{mat.nombre}</Text>
                      <Text style={styles.arrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 70 }}>
                    <Text style={styles.label}>%</Text>
                    <TextInput 
                      style={styles.input} 
                      keyboardType="numeric" 
                      placeholder="50" 
                      placeholderTextColor="#999" 
                      value={mat.porcentaje} 
                      onChangeText={(val) => actualizarMaterial(index, 'porcentaje', val)} 
                    />
                  </View>
                  {materialesTemp.length > 1 && (
                    <TouchableOpacity style={styles.deleteMaterialBtn} onPress={() => setMaterialesTemp(materialesTemp.filter((_, i) => i !== index))}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.addMaterialBtn} onPress={() => setMaterialesTemp([...materialesTemp, { nombre: '', porcentaje: '' }])}>
              <Text style={styles.addMaterialText}>+ Añadir material</Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalCompVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarComposicion}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal visible={editModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar</Text>
            <TextInput style={styles.input} placeholder="Nuevo nombre" placeholderTextColor="#999" value={editItemText} onChangeText={setEditItemText} autoFocus />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarEdicion}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL BORRAR */}
      <Modal visible={modalDeleteVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteIcon}>🗑️</Text>
            <Text style={styles.deleteTitle}>¿Eliminar registro?</Text>
            <Text style={styles.deleteMessage}>¿Seguro que deseas eliminar <Text style={{fontWeight: 'bold'}}>"{itemAEliminar?.nombre}"</Text>?</Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setModalDeleteVisible(false)}><Text style={styles.deleteCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmarBorrado}><Text style={styles.deleteConfirmText}>Sí, eliminar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => router.push('/administrador/registro')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Registro</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Catálogo Textil</Text>

      {/* SECCIÓN TIPOS DE PRENDA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👕 Tipos de Prenda</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Ej: Bata de baño" placeholderTextColor="#999" value={nuevoTipo} onChangeText={setNuevoTipo} />
          <TouchableOpacity style={styles.addButton} onPress={agregarTipo}><Text style={styles.addButtonText}>+</Text></TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Buscar tipo..." placeholderTextColor="#999" value={searchTipo} onChangeText={setSearchTipo} />
        </View>
        {tiposFiltrados.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listItemText}>{item.nombre}</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => abrirEdicion('tipos_prenda', item.id, item.nombre)} style={{ marginRight: 15 }}>
                <Text style={styles.iconText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setItemAEliminar({ tabla: 'tipos_prenda', id: item.id, nombre: item.nombre }); setModalDeleteVisible(true); }}>
                <Text style={styles.iconText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* SECCIÓN COMPOSICIONES */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>🧵 Composiciones</Text>
          <TouchableOpacity style={styles.addBtnSmall} onPress={() => setModalCompVisible(true)}><Text style={styles.addBtnSmallText}>+ Nueva</Text></TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Buscar composición..." placeholderTextColor="#999" value={searchComp} onChangeText={setSearchComp} />
        </View>
        {compsFiltradas.map((comp) => (
          <View key={comp.id} style={styles.listItem}>
            <View>
              <Text style={styles.listItemText}>{comp.nombre}</Text>
              <Text style={styles.listItemSub}>Impacto: {comp.impacto_ambiental}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => abrirEdicion('tipos_tela', comp.id, comp.nombre)} style={{ marginRight: 15 }}>
                <Text style={styles.iconText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setItemAEliminar({ tabla: 'tipos_tela', id: comp.id, nombre: comp.nombre }); setModalDeleteVisible(true); }}>
                <Text style={styles.iconText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 15 },
  backText: { color: '#1565C0', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#0D47A1', marginBottom: 25 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, color: '#333', marginBottom: 10 },
  addButton: { backgroundColor: '#1565C0', width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 10 },
  addButtonText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  addBtnSmall: { backgroundColor: '#1565C0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnSmallText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  searchContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', marginBottom: 15 },
  searchIcon: { fontSize: 16, marginRight: 5 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#333' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  listItemText: { fontSize: 16, color: '#333', flex: 1 },
  listItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  iconText: { fontSize: 18 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '90%', padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  modalSub: { fontSize: 12, color: '#666', marginBottom: 15, textAlign: 'center' },
  materialRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  selectInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, height: 45 },
  selectText: { fontSize: 15, color: '#333' },
  arrow: { fontSize: 12, color: '#999' },
  deleteMaterialBtn: { padding: 12, backgroundColor: '#FFEBEE', borderRadius: 8, marginLeft: 5, height: 45, justifyContent: 'center' },
  deleteText: { fontSize: 16, color: '#D32F2F', fontWeight: 'bold' },
  addMaterialBtn: { padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1565C0', borderStyle: 'dashed', borderRadius: 8, marginBottom: 20 },
  addMaterialText: { color: '#1565C0', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelButton: { padding: 10, marginRight: 10 },
  cancelText: { color: '#666', fontWeight: 'bold', fontSize: 16 },
  saveButton: { backgroundColor: '#1B4D21', padding: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalOverlayBottom: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContentBottom: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  materialOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  materialOptionText: { fontSize: 16, color: '#333', textAlign: 'center' },
  cancelButtonBottom: { marginTop: 15, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, alignItems: 'center' },
  cancelTextBottom: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
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