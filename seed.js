require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  console.log("Conectando a MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Conectado.\n");

  const db = mongoose.connection.db;
  const usuarios = db.collection("Usuarios");
  const rachas   = db.collection("rachas_compartidas");
  const tareas   = db.collection("tareas");

  // ─── 1. LIMPIAR ─────────────────────────────────────────────────────────────
  await usuarios.deleteMany({ $or: [{ nombre: { $exists: false } }, { nombre: null }, { nombre: "undefined" }] });
  await usuarios.deleteMany({ email: /@demo\.com$/ });

  // Eliminar duplicados por email (queda el primero)
  const todos = await usuarios.find({}).toArray();
  const vistos = {};
  const aBorrar = [];
  for (const u of todos) {
    const key = (u.email || "").toLowerCase().trim();
    if (!key) continue;
    if (vistos[key]) aBorrar.push(u._id);
    else vistos[key] = true;
  }
  if (aBorrar.length > 0) await usuarios.deleteMany({ _id: { $in: aBorrar } });

  // Resetear amigos y rachas (eliminar duplicados dentro del array también)
  await usuarios.updateMany({}, { $set: { amigos: [] } });
  await rachas.deleteMany({});

  // Limpiar arrays de amigos duplicados en todos los usuarios
  const todosParaLimpiar = await usuarios.find({}).toArray();
  for (const u of todosParaLimpiar) {
    if (Array.isArray(u.amigos) && u.amigos.length > 0) {
      const unicos = [...new Set(u.amigos)];
      if (unicos.length !== u.amigos.length) {
        await usuarios.updateOne({ _id: u._id }, { $set: { amigos: unicos } });
      }
    }
  }
  console.log("Base limpia.\n");

  // ─── 2. CARGAR USUARIOS ──────────────────────────────────────────────────────
  const pool = await usuarios.find({}).toArray();
  console.log(`Usuarios (${pool.length}):`);
  pool.forEach(u => console.log(`  - ${u.nombre} ${u.apellido} (${u.email})`));

  if (pool.length < 2) {
    console.log("No hay suficientes usuarios.");
    await mongoose.disconnect();
    return;
  }

  const getId = (u) => String(u._id);

  // ─── 3. ACTUALIZAR HORAS Y RACHA INDIVIDUAL VARIADAS ────────────────────────
  // Distribuir horas variadas para que algunos tengan más recompensas que otros
  const horasMin = [180, 300, 480, 600, 900, 1200, 1500, 1800, 2400, 3000];
  const rachasInd = [2, 5, 7, 12, 14, 21, 30, 45, 3, 8];
  const carreras = [
    "Ingeniería en Sistemas", "Medicina", "Derecho", "Diseño Gráfico",
    "Administración de Empresas", "Psicología", "Arquitectura", "Contador Público",
    "Tecnicatura en Programación", "Biología", "Estudiante secundario", "Comunicación Social",
  ];

  for (let i = 0; i < pool.length; i++) {
    const u = pool[i];
    const generarCodigo = (nombre) => {
      const base = (nombre || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'USER';
      const num = Math.floor(1000 + Math.random() * 9000);
      return `${base}#${num}`;
    };
    const update = {
      minutos_totales_estudio: horasMin[i % horasMin.length],
      racha_actual: rachasInd[i % rachasInd.length],
    };
    if (!u.carrera) update.carrera = carreras[i % carreras.length];
    if (!u.codigo_usuario) update.codigo_usuario = generarCodigo(u.nombre);
    await usuarios.updateOne({ _id: u._id }, { $set: update });
  }
  console.log("\nHoras y rachas individuales asignadas.");

  // ─── 4. AMISTADES: cada usuario tiene al menos 6 amigos ─────────────────────
  const n = pool.length;
  const amistades = new Set(); // "idA-idB" para no duplicar

  for (let i = 0; i < n; i++) {
    // Contar cuántos amigos ya tiene este usuario
    const amigosCurrent = [...amistades]
      .filter(p => p.startsWith(getId(pool[i]) + "-") || p.endsWith("-" + getId(pool[i])))
      .length;

    const objetivo = Math.min(6, n - 1);
    if (amigosCurrent >= objetivo) continue;

    // Candidatos: todos los demás con los que aún no es amigo
    const candidatos = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const key = [getId(pool[i]), getId(pool[j])].sort().join("-");
      if (!amistades.has(key)) candidatos.push(j);
    }

    // Agregar hasta completar 6
    let faltantes = objetivo - amigosCurrent;
    for (const j of candidatos) {
      if (faltantes <= 0) break;
      const key = [getId(pool[i]), getId(pool[j])].sort().join("-");
      amistades.add(key);
      faltantes--;
    }
  }

  // Aplicar amistades
  for (const par of amistades) {
    const [idA, idB] = par.split("-");
    const uA = pool.find(u => getId(u) === idA);
    const uB = pool.find(u => getId(u) === idB);
    if (!uA || !uB) continue;
    await usuarios.updateOne({ _id: uA._id }, { $addToSet: { amigos: idB } });
    await usuarios.updateOne({ _id: uB._id }, { $addToSet: { amigos: idA } });
  }
  console.log(`${amistades.size} amistades creadas.`);

  // ─── 5. RACHAS COMPARTIDAS VARIADAS ─────────────────────────────────────────
  const hoy = new Date().toISOString().split("T")[0];
  const diasVariados = [2, 5, 7, 10, 12, 14, 18, 21, 25, 30, 45, 60, 3, 8, 15];
  let dIdx = 0;

  const paresArray = [...amistades];
  // Crear racha para el 70% de los pares
  const paresConRacha = paresArray.filter((_, i) => i % 3 !== 0); // salta 1 de cada 3

  for (const par of paresConRacha) {
    const [idA, idB] = par.split("-");
    const dias = diasVariados[dIdx % diasVariados.length];
    dIdx++;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);
    await rachas.insertOne({
      usuarioA: idA,
      usuarioB: idB,
      estado: "activa",
      racha: dias,
      ultimo_estudio_A: hoy,
      ultimo_estudio_B: hoy,
      fecha_inicio: fechaInicio.toISOString().split("T")[0],
    });
  }
  console.log(`${paresConRacha.length} rachas compartidas creadas.`);

  // ─── 6. EVENTOS EN EL CALENDARIO ────────────────────────────────────────────
  const eventosBase = [
    { titulo: "Parcial de Álgebra",        tipo: "examen", tipo_examen: "parcial",    materia: "Álgebra",               hora_inicio: "10:00", hora_fin: "12:00", dias: 4  },
    { titulo: "Final de Análisis",         tipo: "examen", tipo_examen: "final",      materia: "Análisis Matemático",   hora_inicio: "08:00", hora_fin: "11:00", dias: 15 },
    { titulo: "Entrega TP Redes",          tipo: "tarea",  tipo_examen: null,         materia: "Redes de Computadoras", hora_inicio: "23:59", hora_fin: "23:59", dias: 7  },
    { titulo: "Exposición grupal",         tipo: "examen", tipo_examen: "exposición", materia: "Derecho Civil",         hora_inicio: "14:00", hora_fin: "15:30", dias: 5  },
    { titulo: "Parcial de Anatomía",       tipo: "examen", tipo_examen: "parcial",    materia: "Anatomía",              hora_inicio: "09:00", hora_fin: "11:00", dias: 10 },
    { titulo: "Resumen Psicología",        tipo: "tarea",  tipo_examen: null,         materia: "Psicología",            hora_inicio: "20:00", hora_fin: "22:00", dias: 2  },
    { titulo: "Parcial de Marketing",      tipo: "examen", tipo_examen: "parcial",    materia: "Marketing",             hora_inicio: "11:00", hora_fin: "13:00", dias: 6  },
    { titulo: "Entrega Diseño Final",      tipo: "tarea",  tipo_examen: null,         materia: "Diseño Gráfico",        hora_inicio: "18:00", hora_fin: "20:00", dias: 3  },
    { titulo: "Parcial de Biología",       tipo: "examen", tipo_examen: "parcial",    materia: "Biología",              hora_inicio: "10:00", hora_fin: "12:00", dias: 8  },
    { titulo: "TP Historia Argentina",     tipo: "tarea",  tipo_examen: null,         materia: "Historia Argentina",    hora_inicio: "22:00", hora_fin: "23:00", dias: 1  },
    { titulo: "Final de Química",          tipo: "examen", tipo_examen: "final",      materia: "Química General",       hora_inicio: "09:00", hora_fin: "12:00", dias: 20 },
    { titulo: "Parcial de Estadística",    tipo: "examen", tipo_examen: "parcial",    materia: "Estadística",           hora_inicio: "15:00", hora_fin: "17:00", dias: 12 },
  ];

  for (let i = 0; i < pool.length; i++) {
    const userId = getId(pool[i]);
    // Cada usuario tiene 3 eventos distintos rotativos
    const mis = [
      eventosBase[i % eventosBase.length],
      eventosBase[(i + 3) % eventosBase.length],
      eventosBase[(i + 6) % eventosBase.length],
    ];
    for (const ev of mis) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + ev.dias);
      const fechaStr = fecha.toISOString().split("T")[0];
      const yaExiste = await tareas.findOne({ usuario_id: userId, titulo: ev.titulo });
      if (!yaExiste) {
        await tareas.insertOne({
          usuario_id: userId,
          titulo: ev.titulo,
          descripcion: "",
          tipo: ev.tipo,
          tipo_examen: ev.tipo_examen,
          materia: ev.materia,
          prioridad: "media",
          estado: "pendiente",
          fecha_vencimiento: fechaStr,
          hora_inicio: ev.hora_inicio,
          hora_fin: ev.hora_fin,
          es_evento: true,
        });
      }
    }
    console.log(`  Eventos para ${pool[i].nombre} ✓`);
  }

  console.log("\n✓ Seed completado.");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
