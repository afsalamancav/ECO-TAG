import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';

export default function Inicio() {
  const router = useRouter();
  const [fechaHora, setFechaHora] = useState(new Date());
  
  // Animación para que las tarjetas aparezcan suavemente
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Animación para el logo (efecto de respiración)
  const logoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reloj en vivo
    const timer = setInterval(() => setFechaHora(new Date()), 1000);
    
    // Animación de entrada de las tarjetas
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Animación infinita de "respiración" para el logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearInterval(timer);
  }, []);

  const horaFormateada = fechaHora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const fechaFormateada = fechaHora.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
      
      {/* FONDO DECORATIVO SUPERIOR (HERO) */}
      <View style={styles.heroBackground}>
        <View style={[styles.decorativeCircle, { top: -50, left: -50, width: 200, height: 200 }]} />
        <View style={[styles.decorativeCircle, { bottom: -80, right: -30, width: 250, height: 250 }]} />

        <View style={styles.topBar}>
          <View style={styles.relojContainer}>
            <Text style={styles.hora}>{horaFormateada}</Text>
            <Text style={styles.fecha}>{fechaFormateada}</Text>
          </View>
        </View>

        <View style={styles.logoContainer}>
          {/* LOGO CON ANIMACIÓN DE RESPIRACIÓN */}
          <Animated.View style={[styles.logoCircle, { transform: [{ scale: logoScale }] }]}>
            <Text style={styles.logoIcon}>🌿</Text>
          </Animated.View>
          <Text style={styles.logoTitulo}>ECO-TAG</Text>
          <Text style={styles.logoSubtitulo}>Trazabilidad Textil Inteligente</Text>
        </View>
      </View>

      {/* CONTENEDOR DE ROLES CON ANIMACIÓN */}
      <Animated.View style={[styles.rolesContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        
        <Text style={styles.subtitulo}>Selecciona tu rol</Text>

        <TouchableOpacity activeOpacity={0.8} style={styles.cardBoton} onPress={() => router.push('/administrador/dashboard')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.iconoRol}>👤</Text>
          </View>
          <View style={styles.textoWrapper}>
            <Text style={styles.textoBoton}>Administrador</Text>
            <Text style={styles.textoSubBoton}>Inventario, alertas y gestión global</Text>
          </View>
          <Text style={styles.flecha}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={styles.cardBoton} onPress={() => router.push('/hotel')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.iconoRol}>🏨</Text>
          </View>
          <View style={styles.textoWrapper}>
            <Text style={styles.textoBoton}>Personal Hotel</Text>
            <Text style={styles.textoSubBoton}>Asignación de prendas y escaneo QR</Text>
          </View>
          <Text style={styles.flecha}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={styles.cardBoton} onPress={() => router.push('/lavanderia')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.iconoRol}>🧺</Text>
          </View>
          <View style={styles.textoWrapper}>
            <Text style={styles.textoBoton}>Lavandería</Text>
            <Text style={styles.textoSubBoton}>Recepción de textiles e instrucciones</Text>
          </View>
          <Text style={styles.flecha}>→</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.footerText}>EcoTag v1.0</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  content: { paddingBottom: 40 },

  // Fondo Verde Superior (Hero)
  heroBackground: {
    backgroundColor: '#1B4D21',
    paddingTop: 60,
    paddingBottom: 90, 
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 150,
  },
  topBar: { width: '100%', paddingHorizontal: 30, alignItems: 'flex-end', marginBottom: 25 },
  relojContainer: { alignItems: 'flex-end' },
  hora: { fontSize: 18, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 },
  fecha: { fontSize: 12, color: '#A5D6A7', textTransform: 'capitalize', marginTop: 2, fontWeight: '500' },

  // Logo en el Hero
  logoContainer: { alignItems: 'center' },
  logoCircle: { width: 70, height: 70, backgroundColor: '#FFF', borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  logoIcon: { fontSize: 38 },
  logoTitulo: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: 3 },
  logoSubtitulo: { fontSize: 13, color: '#A5D6A7', marginTop: 5, fontWeight: '600', letterSpacing: 0.5 },

  // Contenedor de Roles
  rolesContainer: { marginTop: -50, paddingHorizontal: 25, paddingTop: 10 },
  
  subtitulo: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#0d7e4f', 
    marginBottom: 25, 
    textTransform: 'uppercase', 
    letterSpacing: 1.5, 
    textAlign: 'center',
    marginTop: 60 
  },

  // Tarjetas de Botones
  cardBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  iconWrapper: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  iconoRol: { fontSize: 28 },
  textoWrapper: { flex: 1 },
  textoBoton: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  textoSubBoton: { fontSize: 12, color: '#777', marginTop: 4, lineHeight: 16 },
  flecha: { fontSize: 22, color: '#CCC', fontWeight: 'bold', marginLeft: 10 },

  // Footer
  footerText: { textAlign: 'center', color: '#B0B0B0', fontSize: 12, marginTop: 15, fontWeight: '500' }
});