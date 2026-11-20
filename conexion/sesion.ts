import Storage from 'expo-sqlite/kv-store';

// Guardar la sesión del hotel (Esto es permanente)
export const guardarSesion = async (idHotel: string, nombreHotel: string) => {
  await Storage.setItem('@ecotag_id_hotel', idHotel);
  await Storage.setItem('@ecotag_nombre_hotel', nombreHotel);
};

// Obtener el ID del hotel actual
export const obtenerIdHotel = async () => {
  return await Storage.getItem('@ecotag_id_hotel');
};

// Obtener el nombre del hotel actual
export const obtenerNombreHotel = async () => {
  return await Storage.getItem('@ecotag_nombre_hotel');
};

// Cerrar sesión (SOLO BORRA LOS DATOS DEL USUARIO, MANTIENE EL HOTEL)
export const cerrarSesion = async () => {
  // No borramos @ecotag_id_hotel ni @ecotag_nombre_hotel
  // Aquí podrías borrar otros datos de usuario si los tuvieras guardados
  // await Storage.removeItem('@ecotag_usuario_logueado'); 
};