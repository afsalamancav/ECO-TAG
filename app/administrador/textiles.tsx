import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const INITIAL_TIPOS = ['Sábana Queen', 'Sábana King', 'Toalla de baño', 'Bata de baño', 'Almohada'];
const MATERIALES_ESTANDAR = ['Algodón', 'Poliéster', 'Tencel', 'Lino', 'Microfibra', 'Elastano', 'Seda', 'Bambú', 'Otro...'];

const INITIAL_COMPS = [
  { id: '1', materiales: [{ nombre: 'Algodón', porcentaje: 100 }] },
  { id: '2', materiales: [{ nombre: 'Algodón', porcentaje: 50 }, { nombre: 'Poliéster', porcentaje: 50 }] },
];

export default function CatalogoTextil() {
  const router = useRouter();
  
  const [tipos, setTipos] = useState(INITIAL_TIPOS);
  const [composiciones, setComposiciones] = useState(INITIAL_COMPS);

  const [nuevoTipo, setNuevoTipo] = useState('');
  const [searchTipo, setSearchTipo] = useState('');
  const [searchComp, setSearchComp] = useState('');

  // Modales
  const [modalCompVisible, setModalCompVisible] = useState(false);
  const [modalMaterialVisible, setModalMaterialVisible] = useState(false);
  const [modalDeleteVisible, setModalDeleteVisible] = useState(false);
  const [modalEditTipoVisible, setModalEditTipoVisible] = useState(false);
  const [modalEditCompVisible, setModalEditCompVisible] = useState(false);

  // Estados de edición
  const [itemAEliminar, setItemAEliminar] = useState<{ tipo: 'tipo' | 'comp', id: string, nombre: string } | null>(null);
  const [tipoEditando, setTipoEditando] = useState<{ viejo: string, nuevo: string }>({ viejo: '', nuevo: '' });
  const [compEditando, setCompEditando] = useState<{ id: string, materiales: any[] }>({ id: '', materiales: [] });

  // Estados para formulario de composición
  const [materialesTemp, setMaterialesTemp] = useState([{ nombre: 'Algodón', porcentaje: '100', esOtro: false }]);
  const [materialIndexEditando, setMaterialIndexEditando] = useState<number | null>(null);

  // --- CRUD TIPOS DE PRENDA ---
  const agregarTipo = () => {
    if (!nuevoTipo.trim()) return;
    setTipos([...tipos, nuevoTipo.trim()]);
    setNuevoTipo('');
  };

  const guardarEdicionTipo = () => {
    if (!tipoEditando.nuevo.trim()) return;
    setTipos(tipos.map(t => t === tipoEditando.viejo ? tipoEditando.nuevo.trim() : t));
    setModalEditTipoVisible(false);
  };

  // --- CRUD COMPOSICIONES ---
  const guardarComposicion = () => {
    const camposVacios = materialesTemp.some(m => !m.nombre.trim() || !m.porcentaje.trim());
    if (camposVacios) return Alert.alert("Error", "Todos los materiales deben tener nombre y porcentaje.");

    const suma = materialesTemp.reduce((acc, m) => acc + (parseInt(m.porcentaje) || 0), 0);
    if (suma !== 100) return Alert.alert("Error", `Los porcentajes suman ${suma}%. Deben sumar 100%.`);

    const nuevaComp = {
      id: Date.now().toString(),
      materiales: materialesTemp.map(m => ({ nombre: m.nombre.trim(), porcentaje: parseInt(m.porcentaje) }))
    };

    setComposiciones([...composiciones, nuevaComp]);
    setModalCompVisible(false);
    setMaterialesTemp([{ nombre: 'Algodón', porcentaje: '100', esOtro: false }]);
  };

  const abrirEdicionComp = (comp: any) => {
    setCompEditando({ id: comp.id, materiales: comp.materiales.map((m: any) => ({ ...m, porcentaje: m.porcentaje.toString(), esOtro: !MATERIALES_ESTANDAR.includes(m.nombre) })) });
    setModalEditCompVisible(true);
  };

  const guardarEdicionComp = () => {
    const camposVacios = compEditando.materiales.some(m => !m.nombre.trim() || !m.porcentaje.trim());
    if (camposVacios) return Alert.alert("Error", "Todos los materiales deben tener nombre y porcentaje.");

    const suma = compEditando.materiales.reduce((acc, m) => acc + (parseInt(m.porcentaje) || 0), 0);
    if (suma !== 100) return Alert.alert("Error", `Los porcentajes suman ${suma}%. Deben sumar 100%.`);

    setComposiciones(composiciones.map(c => 
      c.id === compEditando.id 
        ? { ...c, materiales: compEditando.materiales.map(m => ({ nombre: m.nombre.trim(), porcentaje: parseInt(m.porcentaje) })) } 
        : c
    ));
    setModalEditCompVisible(false);
  };

  // --- LÓGICA DE BORRADO SEGURO ---
  const confirmarBorrado = () => {
    if (!itemAEliminar) return;
    if (itemAEliminar.tipo === 'tipo') setTipos(tipos.filter(t => t !== itemAEliminar.id));
    else setComposiciones(composiciones.filter(c => c.id !== itemAEliminar.id));
    setModalDeleteVisible(false);
    setItemAEliminar(null);
  };

  // --- LÓGICA DE MATERIALES DINÁMICOS ---
    const actualizarMaterial = (index: number, campo: string, valor: string, isEdit: boolean) => {
    if (isEdit) {
      const nuevos = [...compEditando.materiales];
      (nuevos[index] as any)[campo] = valor; // <-- Cambio aquí
      setCompEditando({ ...compEditando, materiales: nuevos });
    } else {
      const nuevos = [...materialesTemp];
      (nuevos[index] as any)[campo] = valor; // <-- Cambio aquí
      setMaterialesTemp(nuevos);
    }
  };

  const seleccionarMaterial = (mat: string) => {
    if (materialIndexEditando === null) return;
    const nuevos = [...materialesTemp];
    if (mat === 'Otro...') {
      nuevos[materialIndexEditando].nombre = '';
      nuevos[materialIndexEditando].esOtro = true;
    } else {
      nuevos[materialIndexEditando].nombre = mat;
      nuevos[materialIndexEditando].esOtro = false;
    }
    setMaterialesTemp(nuevos);
    setModalMaterialVisible(false);
  };

  const formatComp = (comp: any) => comp.materiales.map((m: any) => `${m.porcentaje}% ${m.nombre}`).join(' / ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* MODAL EDITAR TIPO */}
      <Modal visible={modalEditTipoVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar Tipo de Prenda</Text>
            <TextInput style={styles.input} value={tipoEditando.nuevo} onChangeText={(val) => setTipoEditando({ ...tipoEditando, nuevo: val })} autoFocus />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalEditTipoVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarEdicionTipo}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR COMPOSICIÓN */}
      <Modal visible={modalEditCompVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar Composición</Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 15 }}>
              {compEditando.materiales.map((mat, index) => (
                <View key={index} style={styles.materialRow}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} value={mat.nombre} onChangeText={(val) => actualizarMaterial(index, 'nombre', val, true)} placeholder="Material" />
                  <TextInput style={[styles.input, { width: 70 }]} keyboardType="numeric" value={mat.porcentaje} onChangeText={(val) => actualizarMaterial(index, 'porcentaje', val, true)} placeholder="%" />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalEditCompVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarEdicionComp}><Text style={styles.saveText}>Guardar Cambios</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMAR BORRADO */}
      <Modal visible={modalDeleteVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteIcon}>🗑️</Text>
            <Text style={styles.deleteTitle}>¿Eliminar registro?</Text>
            <Text style={styles.deleteMessage}>Estás a punto de eliminar <Text style={{fontWeight: 'bold'}}>"{itemAEliminar?.nombre}"</Text>. Esta acción no se puede deshacer.</Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setModalDeleteVisible(false)}><Text style={styles.deleteCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmarBorrado}><Text style={styles.deleteConfirmText}>Sí, eliminar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR COMPOSICIÓN (Reutilizado) */}
      <Modal visible={modalCompVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nueva Composición</Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 15 }}>
              {materialesTemp.map((mat, index) => (
                <View key={index} style={styles.materialRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>Material</Text>
                    {mat.esOtro ? (
                      <TextInput style={styles.input} value={mat.nombre} onChangeText={(val) => actualizarMaterial(index, 'nombre', val, false)} placeholder="Escribe" autoFocus />
                    ) : (
                      <TouchableOpacity style={styles.selectInput} onPress={() => { setMaterialIndexEditando(index); setModalMaterialVisible(true); }}>
                        <Text style={styles.selectText}>{mat.nombre}</Text><Text style={styles.arrow}>▼</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ width: 70 }}>
                    <Text style={styles.label}>%</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={mat.porcentaje} onChangeText={(val) => actualizarMaterial(index, 'porcentaje', val, false)} />
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.addMaterialBtn} onPress={() => setMaterialesTemp([...materialesTemp, { nombre: '', porcentaje: '', esOtro: false }])}><Text style={styles.addMaterialText}>+ Añadir material</Text></TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalCompVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarComposicion}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL SELECCIONAR MATERIAL */}
      <Modal visible={modalMaterialVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View style={styles.modalContentBottom}>
            <Text style={styles.modalTitle}>Seleccionar Material</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {MATERIALES_ESTANDAR.map((mat) => (
                <TouchableOpacity key={mat} style={styles.materialOption} onPress={() => seleccionarMaterial(mat)}><Text style={styles.materialOptionText}>{mat}</Text></TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelButtonBottom} onPress={() => setModalMaterialVisible(false)}><Text style={styles.cancelTextBottom}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={() => router.push('/administrador/registro')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Registro</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Catálogo Textil</Text>
      <Text style={styles.subtitulo}>Gestiona tipos de prenda y mezclas de telas complejas.</Text>

      {/* SECCIÓN TIPOS DE PRENDA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👕 Tipos de Prenda</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Ej: Bata de baño" value={nuevoTipo} onChangeText={setNuevoTipo} />
          <TouchableOpacity style={styles.addButton} onPress={agregarTipo}><Text style={styles.addButtonText}>+</Text></TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Buscar tipo..." value={searchTipo} onChangeText={setSearchTipo} />
        </View>
        {tipos.filter(t => t.toLowerCase().includes(searchTipo.toLowerCase())).map((item) => (
          <View key={item} style={styles.listItem}>
            <Text style={styles.listItemText}>{item}</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => { setTipoEditando({ viejo: item, nuevo: item }); setModalEditTipoVisible(true); }} style={{ marginRight: 15 }}>
                <Text style={styles.iconText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setItemAEliminar({ tipo: 'tipo', id: item, nombre: item }); setModalDeleteVisible(true); }}>
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
          <TextInput style={styles.searchInput} placeholder="Buscar composición..." value={searchComp} onChangeText={setSearchComp} />
        </View>
        {composiciones.filter(c => formatComp(c).toLowerCase().includes(searchComp.toLowerCase())).map((comp) => (
          <View key={comp.id} style={styles.listItem}>
            <Text style={styles.listItemText}>{formatComp(comp)}</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={() => abrirEdicionComp(comp)} style={{ marginRight: 15 }}>
                <Text style={styles.iconText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setItemAEliminar({ tipo: 'comp', id: comp.id, nombre: formatComp(comp) }); setModalDeleteVisible(true); }}>
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
  backButton: { marginBottom: 15 },
  backText: { color: '#1565C0', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#0D47A1', marginBottom: 5 },
  subtitulo: { fontSize: 14, color: '#546E7A', marginBottom: 25 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16 },
  addButton: { backgroundColor: '#1565C0', width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  addButtonText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  addBtnSmall: { backgroundColor: '#1565C0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnSmallText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  searchContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', marginBottom: 15 },
  searchIcon: { fontSize: 16, marginRight: 5 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#333' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  listItemText: { fontSize: 16, color: '#333', flex: 1 },
  iconText: { fontSize: 18 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '90%', padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  materialRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  selectInput: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, height: 48 },
  selectText: { fontSize: 15, color: '#333' },
  arrow: { fontSize: 12, color: '#999' },
  addMaterialBtn: { padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1565C0', borderStyle: 'dashed', borderRadius: 8, marginBottom: 20 },
  addMaterialText: { color: '#1565C0', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
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