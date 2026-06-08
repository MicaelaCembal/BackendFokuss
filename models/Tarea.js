const mongoose = require("mongoose");

const tareaSchema = new mongoose.Schema({

	usuario_id: {
		type: String,
		required: true,
	},

	titulo: {
		type: String,
		required: true,
	},

	descripcion: {
		type: String,
		default: "",
	},

	tipo: {
		type: String,
		default: "tarea",
	},

	tipo_examen: { type: String, default: null },

	materia: {
		type: String,
		default: "",
	},

	prioridad: {
		type: String,
		default: "media",
	},

	estado: {
		type: String,
		default: "pendiente",
	},

	fecha_creacion: {
		type: Date,
		default: Date.now,
	},

	fecha_vencimiento: {
		type: Date,
		required: true,
	},

	fecha_completada: {
		type: Date,
		default: null,
	},

	hora_inicio: {
		type: String,
		default: "11:00",
	},

	hora_fin: {
		type: String,
		default: "13:00",
	},

	color: {
		type: String,
		default: "#39d0c3",
	},

	es_evento: {
		type: Boolean,
		default: true,
	},

	recordatorio: {
		type: Boolean,
		default: true,
	},

	repetir: {
		type: String,
		default: "none",
	},

	notas: {
		type: String,
		default: "",
	},

});

module.exports = mongoose.model("Tarea", tareaSchema);