import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy'; 
import * as XLSX from 'xlsx';
import { supabase } from '../../conexion/supabase';

export default function Inventario() {
  const router = useRouter();
  
  // Estados principales
  const [inventario, setInventario] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para configuración de Stock (Modal)
  const [modalStockVisible, setModalStockVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);
  const [nuevoStockStr, setNuevoStockStr] = useState('');

  // --- 1. CARGAR INVENTARIO DESDE SUPABASE ---
  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    setCargando(true);
    // Traemos todos los artículos de la base de datos
    const { data, error } = await supabase.from('articulos').select('*');
    
    if (error) {
      Alert.alert("Error", error.message);
    } else if (data) {
      // Como en Supabase cada fila es UNA prenda, agrupamos por tipo_prenda para el conteo
      const agrupado = data.reduce((acc: any, item: any) => {
        const tipo = item.tipo_prenda || 'Sin tipo';
        if (!acc[tipo]) {
          acc[tipo] = { 
            tipo, 
            cantidad: 0, 
            stockMinimo: 10, // Valor por defecto
            icono: tipo.includes('Sábana') ? '🛏️' : tipo.includes('Toalla') ? '🧻' : '👕'
          };
        }
        acc[tipo].cantidad += 1;
        return acc;
      }, {});

      setInventario(Object.values(agrupado));
    }
    setCargando(false);
  };

  const totalPrendas = inventario.reduce((acc, item) => acc + item.cantidad, 0);

  // --- 2. CONFIGURAR STOCK MÍNIMO ---
  const abrirConfiguracionStock = (item: any) => {
    setItemEditando(item);
    setNuevoStockStr(item.stockMinimo.toString());
    setModalStockVisible(true);
  };

  const guardarStockMinimo = () => {
    const valor = parseInt(nuevoStockStr);
    if (isNaN(valor) || valor < 0) {
      Alert.alert("Error", "Ingresa un número válido.");
      return;
    }
    
    // Actualizamos el estado local
    setInventario(inventario.map(item => 
      item.tipo === itemEditando.tipo ? { ...item, stockMinimo: valor } : item
    ));
    setModalStockVisible(false);
    Alert.alert("Guardado", "Stock mínimo actualizado para el reporte.");
    // Nota: Para guardar esto en la nube, se necesitaría una tabla extra de "configuraciones".
  };

  // --- 3. EXPORTACIONES ---
  const generarPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 32px; font-weight: 900; color: #1B4D21; margin: 0; }
              .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #1B4D21; color: #FFF; padding: 12px; text-align: left; font-size: 14px; }
              td { padding: 12px; border-bottom: 1px solid #EEE; font-size: 14px; }
              .total-row td { font-weight: bold; background-color: #F5F5F5; border-top: 2px solid #1B4D21; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="logo">🌿 ECO-TAG</h1>
              <p class="subtitle">Reporte generado el: ${new Date().toLocaleDateString('es-CO')}</p>
            </div>
            <h2>Inventario Actual</h2>
            <table>
              <tr><th>Tipo de Prenda</th><th>Cantidad</th><th>Stock Mínimo</th></tr>
              ${inventario.map(item => `<tr><td>${item.tipo}</td><td>${item.cantidad}</td><td>${item.stockMinimo}</td></tr>`).join('')}
              <tr class="total-row"><td>Total de Prendas</td><td>${totalPrendas}</td><td>-</td></tr>
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Print.printAsync({ uri });
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el PDF.");
    }
  };

  const generarExcel = async () => {
    try {
      const data = [
        ["🌿 ECO-TAG - Inventario de Textiles"],
        ["Reporte generado el:", new Date().toLocaleDateString('es-CO')],
        [], 
        ["Tipo de Prenda", "Cantidad", "Stock Mínimo"],
        ...inventario.map(item => [item.tipo.toUpperCase(), item.cantidad, item.stockMinimo]),
        ["TOTAL PRENDAS", totalPrendas, ""]
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario EcoTag");
      const wbout = XLSX.write(wb, { type: 'base64', bookType: "xlsx" });
      const uri = `${FileSystem.documentDirectory}Inventario_EcoTag.xlsx`;
      
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el Excel.");
    }
  };

  const inventarioFiltrado = inventario.filter(item => 
    item.tipo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      
      {/* MODAL CONFIGURAR STOCK MÍNIMO */}
      <Modal visible={modalStockVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Stock Mínimo</Text>
            <Text style={styles.modalSub}>Configura el límite para recibir alertas de {itemEditando?.tipo}.</Text>
            <TextInput 
              style={styles.modalInput} 
              keyboardType="numeric" 
              value={nuevoStockStr} 
              onChangeText={setNuevoStockStr} 
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalStockVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={guardarStockMinimo}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* INTERFAZ PRINCIPAL */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
          <Text style={styles.backText}>← Volver al Panel</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Inventario</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Prendas en Total</Text>
          <Text style={styles.totalValue}>{totalPrendas.toLocaleString()}</Text>
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar tipo de prenda..." 
            placeholderTextColor="#999" 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
        </View>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#1B4D21" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={inventarioFiltrado}
          keyExtractor={(item) => item.tipo}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const stockBajo = item.cantidad <= item.stockMinimo;
            return (
              <View style={[styles.categoryItem, stockBajo && styles.categoryItemAlert]}>
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryIcon}>{item.icono}</Text>
                  <View>
                    <Text style={styles.categoryName}>{item.tipo}</Text>
                    <TouchableOpacity style={styles.configStockRow} onPress={() => abrirConfiguracionStock(item)}>
                      <Text style={styles.configStockText}>Mínimo: {item.stockMinimo} (Cambiar ⚙️)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.categoryRight}>
                  <View style={styles.countRow}>
                    <Text style={[styles.categoryCount, stockBajo && styles.textAlert]}>{item.cantidad}</Text>
                    {stockBajo && <Text style={styles.alertIcon}>⚠️</Text>}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay prendas en el inventario.</Text>
          }
        />
      )}

      {/* BOTONES DE EXPORTACIÓN */}
      <View style={styles.exportButtonsRow}>
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#FFEBEE' }]} onPress={generarPDF}>
          <Text style={[styles.exportText, { color: '#D32F2F' }]}>📄 Exportar PDF</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#E8F5E9' }]} onPress={generarExcel}>
          <Text style={[styles.exportText, { color: '#2E7D32' }]}>📊 Exportar Excel</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  header: { padding: 20, paddingTop: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21', marginBottom: 20 },

  totalCard: { backgroundColor: '#2E7D32', padding: 25, borderRadius: 16, marginBottom: 20, alignItems: 'center', shadowColor: '#2E7D32', shadowOpacity: 0.3, elevation: 5 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { color: '#FFF', fontSize: 48, fontWeight: '900', marginTop: 5 },

  searchContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15, alignItems: 'center', marginBottom: 15 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },

  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 10, paddingHorizontal: 15, elevation: 1, borderWidth: 1, borderColor: '#EEE' },
  categoryItemAlert: { backgroundColor: '#FFF8E1', borderColor: '#FFECB3' },
  
  categoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryIcon: { fontSize: 24, marginRight: 15 },
  categoryName: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  configStockRow: { marginTop: 4 },
  configStockText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  
  categoryRight: { alignItems: 'flex-end' },
  countRow: { flexDirection: 'row', alignItems: 'center' },
  categoryCount: { fontSize: 22, fontWeight: 'bold', color: '#1B4D21' },
  textAlert: { color: '#D32F2F' },
  alertIcon: { fontSize: 18, marginLeft: 5 },

  exportButtonsRow: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  exportButton: { flex: 1, padding: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#E0E0E0' },
  exportText: { fontWeight: 'bold', fontSize: 15 },

  emptyText: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 30 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '85%', padding: 25, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  saveButton: { flex: 1, backgroundColor: '#1B4D21', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});