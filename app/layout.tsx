import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}> 
      <Stack.Screen name="index" />
      
      {/* RUTAS DEL ADMINISTRADOR */}
      <Stack.Screen name="administrador/dashboard" options={{ title: 'Panel Admin' }} />
      <Stack.Screen name="administrador/registro" options={{ title: 'Gestión de Textiles' }} />
      <Stack.Screen name="administrador/habitaciones" options={{ title: 'Habitaciones' }} />
      <Stack.Screen name="administrador/textiles" options={{ title: 'Catálogo Textil' }} />
      <Stack.Screen name="administrador/alertas" options={{ title: 'Gestión de Alertas' }} />
      <Stack.Screen name="administrador/inventario" options={{ title: 'Inventario Total' }} />
      <Stack.Screen name="administrador/detalle-alerta" options={{ title: 'Detalle de Alerta' }} />

      {/* RUTAS DE HOTEL Y LAVANDERÍA */}
      <Stack.Screen name="hotel/index" options={{ title: 'Personal Hotel' }} />
      <Stack.Screen name="lavanderia/index" options={{ title: 'Lavandería' }} />
    </Stack>
  );
}