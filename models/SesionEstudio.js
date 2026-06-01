const mongoose = require("mongoose");

const SesionEstudioSchema = new mongoose.Schema({

    usuario_id: String,

    materia: String,

    metodo: String,

    duracion_minutos: Number,

    duracion_planificada_minutos: Number,

    completada: Number,

    musica: String,

    notas: String,

    fecha_inicio: String,

    fecha_fin: String

});

module.exports = mongoose.model(
    "SesionEstudio",
    SesionEstudioSchema,
    "sesiones_estudio"
);