const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const usuariosCollection = () => mongoose.connection.db.collection('Usuarios');

// GET mis amigos
router.get('/:userId', async (req, res) => {
    try {
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = await usuariosCollection().find({ _id: { $in: usuario.amigos || [] } }).toArray();
        res.json(amigos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo amigos' });
    }
});

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API = "https://backendfokuss.onrender.com";

interface Amigo {
  _id: string;
  nombre: string;
  apellido: string;
  carrera?: string;
  minutos_totales_estudio?: number;
}

export default function FriendsScreen() {
  const userId = (global as any).usuario?._id;

  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [sugerencias, setSugerencias] = useState<Amigo[]>([]);
  const [solicitudes, setSolicitudes] = useState<Amigo[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Amigo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const resAmigos = await fetch(`${API}/api/amigos/${userId}`);
      const dataAmigos = await resAmigos.json();
      setAmigos(Array.isArray(dataAmigos) ? dataAmigos : []);

      const resSugerencias = await fetch(`${API}/api/amigos/${userId}/sugerencias`);
      const dataSugerencias = await resSugerencias.json();
      setSugerencias(Array.isArray(dataSugerencias) ? dataSugerencias.slice(0, 6) : []);

      const resSolicitudes = await fetch(`${API}/api/amigos/${userId}/solicitudes`);
      const dataSolicitudes = await resSolicitudes.json();
      setSolicitudes(Array.isArray(dataSolicitudes) ? dataSolicitudes : []);
    } catch (e) {
      console.log(e);
    } finally {
      setCargando(false);
    }
  };

  const buscarAmigos = async (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setResultados([]); return; }
    try {
      const res = await fetch(`${API}/api/amigos/${userId}/buscar?q=${q}`);
      const data = await res.json();
      setResultados(Array.isArray(data) ? data : []);
    } catch (e) {
      setResultados([]);
    }
  };

  const enviarSolicitud = async (amigoId: string) => {
    try {
      const res = await fetch(`${API}/api/amigos/${userId}/solicitud`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amigoId }),
      });
      const data = await res.json();
      Alert.alert(data.mensaje || "Solicitud enviada");
      cargarDatos();
      setResultados([]);
      setBusqueda("");
    } catch (e) {
      console.log(e);
    }
  };

  const aceptar = async (amigoId: string) => {
    try {
      await fetch(`${API}/api/amigos/${userId}/aceptar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amigoId }),
      });
      cargarDatos();
    } catch (e) {
      console.log(e);
    }
  };

  const rechazar = async (amigoId: string) => {
    try {
      await fetch(`${API}/api/amigos/${userId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amigoId }),
      });
      cargarDatos();
    } catch (e) {
      console.log(e);
    }
  };

  const eliminar = async (amigoId: string) => {
    Alert.alert(
      "¿Eliminar amigo?",
      "¿Estás segura de que querés eliminar a este amigo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${API}/api/amigos/${userId}/eliminar`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amigoId }),
              });
              cargarDatos();
            } catch (e) {
              console.log(e);
            }
          },
        },
      ]
    );
  };

  const horas = (mins: number = 0) => Math.round(mins / 60);
  const amigosIds = amigos.map((a) => a._id);
  const resultadosAmigos = resultados.filter((r) => amigosIds.includes(r._id));
  const resultadosSugerencias = resultados.filter((r) => !amigosIds.includes(r._id));

  return (
    <ImageBackground
      source={require("../../assets/images/fondo.png")}
      resizeMode="cover"
      style={styles.background}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Amigos</Text>
        </View>

        <TextInput
          style={styles.buscador}
          placeholder="Buscar amigo..."
          placeholderTextColor="#C4B0E0"
          value={busqueda}
          onChangeText={buscarAmigos}
        />

        {busqueda.length >= 2 ? (
          <>
            {resultadosAmigos.length > 0 && (
              <>
                <Text style={styles.seccion}>Tus amigos</Text>
                {resultadosAmigos.map((a) => (
                  <View key={a._id} style={styles.cardHorizontal}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{a.nombre[0]}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.nombre}>{a.nombre} {a.apellido}</Text>
                      {a.carrera && <Text style={styles.detalle}>{a.carrera}</Text>}
                    </View>
                    <TouchableOpacity style={styles.btnEliminar} onPress={() => eliminar(a._id)}>
                      <Text style={styles.btnEliminarTexto}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            {resultadosSugerencias.length > 0 && (
              <>
                <Text style={styles.seccion}>Otros usuarios</Text>
                {resultadosSugerencias.map((a) => (
                  <View key={a._id} style={styles.cardHorizontal}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{a.nombre[0]}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.nombre}>{a.nombre} {a.apellido}</Text>
                      {a.carrera && <Text style={styles.detalle}>{a.carrera}</Text>}
                    </View>
                    <TouchableOpacity style={styles.btnAgregar} onPress={() => enviarSolicitud(a._id)}>
                      <Text style={styles.btnAgregarTexto}>+</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
            {resultados.length === 0 && <Text style={styles.vacio}>Sin resultados.</Text>}
          </>
        ) : (
          <>
            {solicitudes.length > 0 && (
              <>
                <Text style={styles.seccion}>Solicitudes pendientes</Text>
                {solicitudes.map((s) => (
                  <View key={s._id} style={styles.cardHorizontal}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{s.nombre[0]}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.nombre}>{s.nombre} {s.apellido}</Text>
                      <Text style={styles.detalle}>quiere ser tu amigo</Text>
                    </View>
                    <TouchableOpacity style={styles.btnAceptar} onPress={() => aceptar(s._id)}>
                      <Text style={styles.btnAceptarTexto}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnRechazar} onPress={() => rechazar(s._id)}>
                      <Text style={styles.btnRechazarTexto}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.seccion}>Mis amigos</Text>
            {cargando ? (
              <ActivityIndicator color="#7C4DCC" />
            ) : amigos.length === 0 ? (
              <Text style={styles.vacio}>Todavía no tenés amigos.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.amigosScroll}>
                {amigos.map((a) => (
                  <TouchableOpacity
                    key={a._id}
                    style={styles.cardCuadrado}
                    onLongPress={() => eliminar(a._id)}
                  >
                    <View style={styles.avatarGrande}>
                      <Text style={styles.avatarGrandeTexto}>{a.nombre[0]}</Text>
                    </View>
                    <Text style={styles.cardNombre} numberOfLines={1}>{a.nombre}</Text>
                    <Text style={styles.cardDetalle} numberOfLines={1}>{a.carrera || ""}</Text>
                    <Text style={styles.cardHoras}>{horas(a.minutos_totales_estudio)}h</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.seccion}>Sugerencias</Text>
            {sugerencias.length === 0 ? (
              <Text style={styles.vacio}>Sin sugerencias.</Text>
            ) : (
              <View style={styles.grid}>
                {sugerencias.map((a) => (
                  <View key={a._id} style={styles.gridCard}>
                    <View style={styles.avatarGrid}>
                      <Text style={styles.avatarGridTexto}>{a.nombre[0]}</Text>
                    </View>
                    <Text style={styles.gridNombre} numberOfLines={1}>{a.nombre}</Text>
                    <Text style={styles.gridDetalle} numberOfLines={1}>{a.carrera || ""}</Text>
                    <Text style={styles.gridHoras}>{horas(a.minutos_totales_estudio)}h</Text>
                    <TouchableOpacity style={styles.btnGridAgregar} onPress={() => enviarSolicitud(a._id)}>
                      <Text style={styles.btnGridAgregarTexto}>+ Agregar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 22 },
  header: { alignItems: "center", marginBottom: 20 },
  headerTitle: {
    fontSize: 22, fontWeight: "800", color: "#4A2D8D",
    backgroundColor: "#EDE3FF", paddingHorizontal: 28,
    paddingVertical: 8, borderRadius: 20, overflow: "hidden",
  },
  buscador: {
    backgroundColor: "#EDE3FF", borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, color: "#3A1F6D", marginBottom: 24,
  },
  seccion: { fontSize: 18, fontWeight: "800", color: "#4A2D8D", marginBottom: 12 },
  vacio: { color: "#9B7DCC", fontSize: 14, marginBottom: 20 },
  cardHorizontal: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FBF5FF", borderRadius: 20,
    padding: 14, marginBottom: 12, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#DFA9FF", alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#4A2D8D" },
  info: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: "700", color: "#3A1F6D" },
  detalle: { fontSize: 12, color: "#9B7DCC", marginTop: 2 },
  btnEliminar: { backgroundColor: "#FEE2E2", borderRadius: 12, padding: 8 },
  btnEliminarTexto: { color: "#DC2626", fontWeight: "700", fontSize: 14 },
  btnAgregar: { backgroundColor: "#EDE3FF", borderRadius: 12, padding: 8 },
  btnAgregarTexto: { color: "#7C4DCC", fontWeight: "700", fontSize: 20 },
  btnAceptar: { backgroundColor: "#D1FAE5", borderRadius: 12, padding: 8, marginLeft: 4 },
  btnAceptarTexto: { color: "#059669", fontWeight: "700", fontSize: 16 },
  btnRechazar: { backgroundColor: "#FEE2E2", borderRadius: 12, padding: 8, marginLeft: 4 },
  btnRechazarTexto: { color: "#DC2626", fontWeight: "700", fontSize: 16 },
  amigosScroll: { marginBottom: 24 },
  cardCuadrado: {
    backgroundColor: "#FBF5FF", borderRadius: 20,
    padding: 14, marginRight: 12, width: 120,
    alignItems: "center",
  },
  avatarGrande: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#DFA9FF", alignItems: "center",
    justifyContent: "center", marginBottom: 8,
  },
  avatarGrandeTexto: { fontSize: 22, fontWeight: "800", color: "#4A2D8D" },
  cardNombre: { fontSize: 13, fontWeight: "700", color: "#3A1F6D", textAlign: "center" },
  cardDetalle: { fontSize: 11, color: "#9B7DCC", textAlign: "center", marginTop: 2 },
  cardHoras: { fontSize: 13, fontWeight: "700", color: "#7C4DCC", marginTop: 4 },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", marginBottom: 24,
  },
  gridCard: {
    backgroundColor: "#FBF5FF", borderRadius: 20,
    padding: 14, width: "48%", marginBottom: 12,
    alignItems: "center",
  },
  avatarGrid: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#DFA9FF", alignItems: "center",
    justifyContent: "center", marginBottom: 8,
  },
  avatarGridTexto: { fontSize: 20, fontWeight: "800", color: "#4A2D8D" },
  gridNombre: { fontSize: 13, fontWeight: "700", color: "#3A1F6D", textAlign: "center" },
  gridDetalle: { fontSize: 11, color: "#9B7DCC", textAlign: "center", marginTop: 2 },
  gridHoras: { fontSize: 13, fontWeight: "700", color: "#7C4DCC", marginTop: 4 },
  btnGridAgregar: {
    backgroundColor: "#7C4DCC", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 6, marginTop: 10,
  },
  btnGridAgregarTexto: { color: "#FFF", fontWeight: "700", fontSize: 12 },
});

// GET buscar amigo por nombre/email
router.get('/:userId/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        const normalizar = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const qNormalizado = normalizar(q);

        const todos = await usuariosCollection().find({}).toArray();
        const resultados = todos.filter(u => {
            const nombre = normalizar(u.nombre || '');
            const apellido = normalizar(u.apellido || '');
            const email = normalizar(u.email || '');
            return nombre.includes(qNormalizado) || apellido.includes(qNormalizado) || email.includes(qNormalizado);
        });

        res.json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error buscando usuarios' });
    }
});

// POST enviar solicitud de amistad
router.post('/:userId/solicitud', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        const amigo = await usuariosCollection().findOne({ _id: amigoId });

        if (!usuario || !amigo) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = usuario.amigos || [];
        if (amigos.includes(amigoId)) return res.status(400).json({ mensaje: 'Ya son amigos' });

        const solicitudesPendientes = amigo.solicitudes_pendientes || [];
        if (solicitudesPendientes.includes(req.params.userId)) {
            return res.status(400).json({ mensaje: 'Ya existe una solicitud pendiente' });
        }

        solicitudesPendientes.push(req.params.userId);
        await usuariosCollection().updateOne(
            { _id: amigoId },
            { $set: { solicitudes_pendientes: solicitudesPendientes } }
        );

        res.json({ mensaje: 'Solicitud enviada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error enviando solicitud' });
    }
});

// POST aceptar solicitud
router.post('/:userId/aceptar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = usuario.amigos || [];
        if (!amigos.includes(amigoId)) amigos.push(amigoId);

        const amigo = await usuariosCollection().findOne({ _id: amigoId });
        const amigosDeAmigo = amigo?.amigos || [];
        if (!amigosDeAmigo.includes(req.params.userId)) amigosDeAmigo.push(req.params.userId);

        const solicitudes = (usuario.solicitudes_pendientes || []).filter(id => id !== amigoId);

        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { amigos, solicitudes_pendientes: solicitudes } }
        );
        await usuariosCollection().updateOne(
            { _id: amigoId },
            { $set: { amigos: amigosDeAmigo } }
        );

        res.json({ mensaje: 'Solicitud aceptada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error aceptando solicitud' });
    }
});

// POST rechazar solicitud
router.post('/:userId/rechazar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const solicitudes = (usuario.solicitudes_pendientes || []).filter(id => id !== amigoId);
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { solicitudes_pendientes: solicitudes } }
        );

        res.json({ mensaje: 'Solicitud rechazada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error rechazando solicitud' });
    }
});

// GET solicitudes pendientes
router.get('/:userId/solicitudes', async (req, res) => {
    try {
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const solicitudesIds = usuario.solicitudes_pendientes || [];
        const solicitudes = await usuariosCollection().find({ _id: { $in: solicitudesIds } }).toArray();
        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo solicitudes' });
    }
});

// DELETE eliminar amigo
router.delete('/:userId/eliminar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = (usuario.amigos || []).filter(id => id !== amigoId);
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { amigos } }
        );
        res.json({ mensaje: 'Amigo eliminado', amigos });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error eliminando amigo' });
    }
});

module.exports = router;