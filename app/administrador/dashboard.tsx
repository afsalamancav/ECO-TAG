import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const router = useRouter();
  const [fechaHora, setFechaHora] = useState(new Date());

  // Reloj en vivo
  useEffect(() => {
    const timer = setInterval(() => setFechaHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const horaFormateada = fechaHora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  
  const hora = fechaHora.getHours();
  let saludo = 'Buenas noches';
  if (hora < 12) saludo = 'Buenos días';
  else if (hora < 18) saludo = 'Buenas tardes';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* CABECERA CON SALUDO Y RELOJ */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>{saludo},</Text>
          <Text style={styles.titulo}>Administrador</Text>
        </View>
        <View style={styles.relojContainer}>
          <Text style={styles.hora}>{horaFormateada}</Text>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.exitButton}>
            <Text style={styles.exitText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MINI PANEL DE ESTADO (RESUMEN) */}
      <View style={styles.statusPanel}>
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>📦</Text>
          <View>
            <Text style={styles.statusValue}>1,250</Text>
            <Text style={styles.statusLabel}>Prendas</Text>
          </View>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>🧺</Text>
          <View>
            <Text style={styles.statusValue}>120</Text>
            <Text style={styles.statusLabel}>Lavandería</Text>
          </View>
        </View>
      </View>

      {/* ACCESOS DIRECTOS */}
      <Text style={styles.sectionTitle}>Accesos Operativos</Text>
      
      <View style={styles.menuContainer}>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/administrador/registro')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.menuIcon}>👕</Text>
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Gestión Textiles</Text>
            <Text style={styles.menuSub}>Registrar al almacén o dar de baja</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/administrador/inventario')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#F3E5F5' }]}>
            <Text style={styles.menuIcon}>📦</Text>
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Inventario</Text>
            <Text style={styles.menuSub}>Ver stock por categoría y exportar</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/administrador/habitaciones')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.menuIcon}>🚪</Text>
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Habitaciones y QRs</Text>
            <Text style={styles.menuSub}>Generar códigos para el personal</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/administrador/historial')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.menuIcon}>📋</Text>
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Historial y Trazabilidad</Text>
            <Text style={styles.menuSub}>Hoja de vida de las prendas por NFC</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

      </View>

      {/* ALERTAS DEL SISTEMA */}
      <View style={styles.alertsHeader}>
        <Text style={styles.sectionTitle}>Alertas Recientes</Text>
        <TouchableOpacity onPress={() => router.push('/administrador/alertas')}>
          <Text style={styles.linkText}>Configurar ⚙️</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.alertCard} 
        onPress={() => router.push({ pathname: '/administrador/detalle-alerta', params: { tipo: 'r1' } })}
      >
        <View style={styles.alertTop}>
          <View style={styles.alertBadgeInfo}><Text style={styles.badgeTextInfo}>AMBIENTAL</Text></View>
          <Text style={styles.alertTime}>Hace 2 horas</Text>
        </View>
        <Text style={styles.alertTitle}>Alto consumo hídrico detectado</Text>
        <Text style={styles.alertText}>Prendas con alto porcentaje de fibras sintéticas. Revisa la lista para optimizar lavados.</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.alertCard} 
        onPress={() => router.push({ pathname: '/administrador/detalle-alerta', params: { tipo: 'r2' } })}
      >
        <View style={styles.alertTop}>
          <View style={styles.alertBadgeDanger}><Text style={styles.badgeTextDanger}>CRÍTICO</Text></View>
          <Text style={styles.alertTime}>Hace 5 horas</Text>
        </View>
        <Text style={styles.alertTitle}>Límite de vida útil</Text>
        <Text style={styles.alertText}>45 prendas han superado los 200 lavados. Se recomienda retirarlas de circulación.</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  
  // Cabecera
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  saludo: { fontSize: 16, color: '#666' },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21' },
  relojContainer: { alignItems: 'flex-end' },
  hora: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  exitButton: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  exitText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 12 },

  // Panel de estado
  statusPanel: { flexDirection: 'row', backgroundColor: '#1B4D21', borderRadius: 16, padding: 20, marginBottom: 25, shadowColor: '#1B4D21', shadowOpacity: 0.3, elevation: 5 },
  statusItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statusIcon: { fontSize: 28, marginRight: 12 },
  statusValue: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  statusLabel: { fontSize: 12, color: '#A5D6A7', fontWeight: '500' },
  statusDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 15 },

  // Títulos de sección
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 5 },

  // Menú de accesos
  menuContainer: { marginBottom: 25 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  iconWrapper: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuIcon: { fontSize: 24 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  menuSub: { fontSize: 12, color: '#888', marginTop: 3 },
  menuArrow: { fontSize: 24, color: '#CCC', fontWeight: 'bold' },

  // Alertas
  alertsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 5 },
  linkText: { color: '#1565C0', fontWeight: 'bold', fontSize: 14 },
  
  alertCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 16, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#F44336', shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  
  // Badges (Píldoras de colores)
  alertBadgeInfo: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTextInfo: { fontSize: 10, fontWeight: 'bold', color: '#1565C0', letterSpacing: 0.5 },
  alertBadgeDanger: { backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTextDanger: { fontSize: 10, fontWeight: 'bold', color: '#D32F2F', letterSpacing: 0.5 },
  
  alertTime: { fontSize: 11, color: '#AAA' },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  alertText: { fontSize: 13, color: '#666', lineHeight: 18 },
});