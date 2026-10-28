import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy'; 
import * as XLSX from 'xlsx';

// Inventario inicial con Stock Mínimo
const INITIAL_INVENTARIO = [
  { id: '1', tipo: 'Sábana King', cantidad: 420, stockMinimo: 100, icono: '🛏️' },
  { id: '2', tipo: 'Sábana Queen', cantidad: 350, stockMinimo: 100, icono: '🛏️' },
  { id: '3', tipo: 'Toalla de baño', cantidad: 50, stockMinimo: 80, icono: '🧻' }, // Alerta (50 < 80)
  { id: '4', tipo: 'Funda de almohada', cantidad: 150, stockMinimo: 50, icono: '🛌' },
  { id: '5', tipo: 'Bata de baño', cantidad: 10, stockMinimo: 20, icono: '🥼' }, // Alerta (10 < 20)
];

export default function Inventario() {
  const router = useRouter();
  
  // Estados principales
  const [inventario, setInventario] = useState(INITIAL_INVENTARIO);
  
  // Estados para el Modal de Configuración de Stock
  const [modalStockVisible, setModalStockVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState<any>(null);
  const [nuevoStockStr, setNuevoStockStr] = useState('');

  const totalPrendas = inventario.reduce((acc, item) => acc + item.cantidad, 0);

  // --- LÓGICA DE STOCK ---
  const abrirConfiguracionStock = (item: any) => {
    setItemEditando(item);
    setNuevoStockStr(item.stockMinimo.toString());
    setModalStockVisible(true);
  };

  const guardarStockMinimo = () => {
    const valor = parseInt(nuevoStockStr);
    if (isNaN(valor) || valor < 0) {
      Alert.alert("Error", "Por favor ingresa un número válido.");
      return;
    }
    
    setInventario(inventario.map(item => 
      item.id === itemEditando.id ? { ...item, stockMinimo: valor } : item
    ));
    setModalStockVisible(false);
  };

  // --- EXPORTACIONES ---
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
            <h2>Inventario General</h2>
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
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

      <TouchableOpacity onPress={() => router.push('/administrador/dashboard')} style={styles.backButton}>
        <Text style={styles.backText}>← Volver al Panel</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Inventario Total</Text>
      
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Prendas en Total</Text>
        <Text style={styles.totalValue}>{totalPrendas.toLocaleString()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Desglose por Categoría</Text>

      <View style={styles.categoryContainer}>
        {inventario.map((item) => {
          const stockBajo = item.cantidad <= item.stockMinimo;
          
          return (
            <View key={item.id} style={[styles.categoryItem, stockBajo && styles.categoryItemAlert]}>
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
        })}
      </View>

      <View style={styles.exportButtonsRow}>
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#FFEBEE' }]} onPress={generarPDF}>
          <Text style={[styles.exportText, { color: '#D32F2F' }]}>📄 Exportar PDF</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#E8F5E9' }]} onPress={generarExcel}>
          <Text style={[styles.exportText, { color: '#2E7D32' }]}>📊 Exportar Excel</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F7' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  backButton: { marginBottom: 15 },
  backText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21', marginBottom: 5 },
  
  // Tarjeta Total
  totalCard: { backgroundColor: '#2E7D32', padding: 25, borderRadius: 16, marginBottom: 25, alignItems: 'center', shadowColor: '#2E7D32', shadowOpacity: 0.3, elevation: 5 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { color: '#FFF', fontSize: 48, fontWeight: '900', marginTop: 5 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  categoryContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  
  // Fila de Categoría
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  categoryItemAlert: { backgroundColor: '#FFF8E1', borderRadius: 8, borderBottomWidth: 0, marginVertical: 5, paddingHorizontal: 10 },
  
  categoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryIcon: { fontSize: 24, marginRight: 15 },
  categoryName: { fontSize: 16, color: '#333', fontWeight: '500' },
  
  // Texto sutil para cambiar el mínimo
  configStockRow: { marginTop: 4 },
  configStockText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  
  categoryRight: { alignItems: 'flex-end' },
  countRow: { flexDirection: 'row', alignItems: 'center' },
  categoryCount: { fontSize: 20, fontWeight: 'bold', color: '#1B4D21' },
  textAlert: { color: '#D32F2F' },
  alertIcon: { fontSize: 16, marginLeft: 5 },

  // Exportación
  exportButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  exportButton: { flex: 1, padding: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#E0E0E0' },
  exportText: { fontWeight: 'bold', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#FFF', width: '80%', padding: 25, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5, textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, backgroundColor: '#F5F5F5', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  cancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  saveButton: { flex: 1, backgroundColor: '#1B4D21', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});