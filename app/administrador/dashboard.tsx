import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../conexion/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  
  const [stats, setStats] = useState({
    habitaciones: 0,
    prendasTotal: 0,
    enAlmacen: 0,
    enLavanderia: 0,
    asignadas: 0,
    perdidas: 0
  });
  const [alertasActivas, setAlertasActivas] = useState<any>({});
  const [cargando, setCargando] = useState(true);

  const [horaActual, setHoraActual] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hora = horaActual.getHours();
  let saludo = 'Buenas noches';
  if (hora < 12) saludo = 'Buenos días';
  else if (hora < 18) saludo = 'Buenas tardes';

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setCargando(true);

    const { count: countHabs } = await supabase.from('habitaciones').select('*', { count: 'exact', head: true });
    const { count: countPrendas } = await supabase.from('articulos').select('*', { count: 'exact', head: true });
    const { count: countAlmacen } = await supabase.from('articulos').select('*', { count: 'exact', head: true }).eq('estado', 'Disponible');
    
    // CAMBIO CLAVE: Sumamos las que están en tránsito y en lavandería
    const { count: countLavanderia } = await supabase.from('articulos').select('*', { count: 'exact', head: true }).in('estado', ['Lavandería', 'En Tránsito']);
    
    const { count: countAsignadas } = await supabase.from('articulos').select('*', { count: 'exact', head: true }).eq('estado', 'Asignada');
    const { count: countPerdidas } = await supabase.from('articulos').select('*', { count: 'exact', head: true }).eq('estado', 'Perdida');

    const { data: configAlertas } = await supabase.from('configuracion_alertas').select('*');
    const alertasMap: any = {};
    if (configAlertas) {
      configAlertas.forEach(a => { alertasMap[a.id] = a.activa; });
    }

    setStats({
      habitaciones: countHabs || 0,
      prendasTotal: countPrendas || 0,
      enAlmacen: countAlmacen || 0,
      enLavanderia: countLavanderia || 0,
      asignadas: countAsignadas || 0,
      perdidas: countPerdidas || 0
    });
    
    setAlertasActivas(alertasMap);
    setCargando(false);
  };

  if (cargando) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B4D21" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.saludo}>{saludo},</Text>
          <Text style={styles.titulo}>Administrador</Text>
        </View>
        <View style={styles.relojContainer}>
          <Text style={styles.hora}>{horaActual.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Text>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.exitButton}>
            <Text style={styles.exitText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Habitaciones del Hotel</Text>
      <TouchableOpacity style={styles.habitacionesCard} onPress={() => router.push('/administrador/habitaciones')}>
        <Text style={styles.habIcon}>🚪</Text>
        <View style={styles.habInfo}>
          <Text style={styles.habValue}>{stats.habitaciones}</Text>
          <Text style={styles.habLabel}>Habitaciones Registradas</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Estado del Inventario Textil</Text>
      
      <View style={styles.inventoryGrid}>
        <View style={[styles.invCard, { borderLeftColor: '#2E7D32' }]}>
          <Text style={styles.invValue}>{stats.prendasTotal}</Text>
          <Text style={styles.invLabel}>Total Prendas</Text>
        </View>
        <View style={[styles.invCard, { borderLeftColor: '#1565C0' }]}>
          <Text style={[styles.invValue, { color: '#1565C0' }]}>{stats.enAlmacen}</Text>
          <Text style={styles.invLabel}>En Almacén</Text>
        </View>
        <View style={[styles.invCard, { borderLeftColor: '#E65100' }]}>
          <Text style={[styles.invValue, { color: '#E65100' }]}>{stats.enLavanderia}</Text>
          <Text style={styles.invLabel}>En Lavandería/Tránsito</Text>
        </View>
        <View style={[styles.invCard, { borderLeftColor: '#FF9800' }]}>
          <Text style={[styles.invValue, { color: '#FF9800' }]}>{stats.asignadas}</Text>
          <Text style={styles.invLabel}>Asignadas</Text>
        </View>
        <View style={[styles.invCard, { borderLeftColor: '#F44336', width: '100%', marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[styles.invValue, { color: '#F44336' }]}>{stats.perdidas}</Text>
              <Text style={styles.invLabel}>Prendas Perdidas / Bajas</Text>
            </View>
            <Text style={{ fontSize: 30 }}>⚠️</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Accesos Operativos</Text>
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/administrador/registro')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#E8F5E9' }]}><Text style={styles.menuIcon}>👕</Text></View>
          <View style={styles.menuTextContainer}><Text style={styles.menuTitle}>Gestión Textiles</Text><Text style={styles.menuSub}>Registrar al almacén o dar de baja</Text></View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/administrador/inventario')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#F3E5F5' }]}><Text style={styles.menuIcon}>📦</Text></View>
          <View style={styles.menuTextContainer}><Text style={styles.menuTitle}>Inventario</Text><Text style={styles.menuSub}>Ver stock por categoría y exportar</Text></View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/administrador/historial')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FFF3E0' }]}><Text style={styles.menuIcon}>📋</Text></View>
          <View style={styles.menuTextContainer}><Text style={styles.menuTitle}>Historial y Trazabilidad</Text><Text style={styles.menuSub}>Hoja de vida de las prendas por NFC</Text></View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.alertsHeader}>
        <Text style={styles.sectionTitle}>Alertas Recientes</Text>
        <TouchableOpacity onPress={() => router.push('/administrador/alertas')}>
          <Text style={styles.linkText}>Configurar ⚙️</Text>
        </TouchableOpacity>
      </View>
      
      {alertasActivas['r1'] !== false && (
        <TouchableOpacity style={[styles.alertCard, { borderLeftColor: '#2196F3' }]} onPress={() => router.push({ pathname: '/administrador/detalle-alerta', params: { tipo: 'r1' } })}>
          <View style={styles.alertTop}><View style={styles.alertBadgeInfo}><Text style={styles.badgeTextInfo}>AMBIENTAL</Text></View></View>
          <Text style={styles.alertTitle}>Alto consumo hídrico detectado</Text>
          <Text style={styles.alertText}>Prendas con alto porcentaje de fibras sintéticas. Revisa la lista para optimizar lavados.</Text>
        </TouchableOpacity>
      )}

      {alertasActivas['r2'] !== false && (
        <TouchableOpacity style={[styles.alertCard, { borderLeftColor: '#F44336' }]} onPress={() => router.push({ pathname: '/administrador/detalle-alerta', params: { tipo: 'r2' } })}>
          <View style={styles.alertTop}><View style={styles.alertBadgeDanger}><Text style={styles.badgeTextDanger}>CRÍTICO</Text></View></View>
          <Text style={styles.alertTitle}>Límite de vida útil</Text>
          <Text style={styles.alertText}>Hay prendas que han superado los 200 lavados. Se recomienda retirarlas de circulación.</Text>
        </TouchableOpacity>
      )}

      {alertasActivas['r3'] !== false && (
        <TouchableOpacity style={[styles.alertCard, { borderLeftColor: '#FF9800' }]} onPress={() => router.push({ pathname: '/administrador/detalle-alerta', params: { tipo: 'r3' } })}>
          <View style={styles.alertTop}><View style={[styles.alertBadgeInfo, { backgroundColor: '#FFF3E0' }]}><Text style={[styles.badgeTextInfo, { color: '#E65100' }]}>OPERATIVO</Text></View></View>
          <Text style={styles.alertTitle}>Retraso en Lavandería</Text>
          <Text style={styles.alertText}>Prendas que llevan mucho tiempo en el área de lavado sin ser procesadas.</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  content: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  saludo: { fontSize: 16, color: '#666' },
  titulo: { fontSize: 28, fontWeight: '900', color: '#1B4D21' },
  relojContainer: { alignItems: 'flex-end' },
  hora: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  exitButton: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  exitText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  habitacionesCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B4D21', padding: 20, borderRadius: 16, marginBottom: 25, elevation: 4 },
  habIcon: { fontSize: 40, marginRight: 15 },
  habInfo: { flex: 1 },
  habValue: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  habLabel: { fontSize: 14, color: '#A5D6A7' },
  arrow: { fontSize: 30, color: '#FFF', opacity: 0.5 },
  inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  invCard: { width: '48%', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 5, elevation: 2 },
  invValue: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  invLabel: { fontSize: 12, color: '#666', marginTop: 5, fontWeight: 'bold' },
  menuContainer: { marginBottom: 25 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2 },
  iconWrapper: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuIcon: { fontSize: 24 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  menuSub: { fontSize: 12, color: '#888', marginTop: 3 },
  menuArrow: { fontSize: 24, color: '#CCC', fontWeight: 'bold' },
  alertsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 5 },
  linkText: { color: '#1565C0', fontWeight: 'bold', fontSize: 14 },
  alertCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 16, marginBottom: 15, borderLeftWidth: 4, elevation: 2 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  alertBadgeInfo: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTextInfo: { fontSize: 10, fontWeight: 'bold', color: '#1565C0', letterSpacing: 0.5 },
  alertBadgeDanger: { backgroundColor: '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTextDanger: { fontSize: 10, fontWeight: 'bold', color: '#D32F2F', letterSpacing: 0.5 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  alertText: { fontSize: 13, color: '#666', lineHeight: 18 },
});