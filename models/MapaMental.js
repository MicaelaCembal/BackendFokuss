const mongoose = require('mongoose');

const NodoSchema = new mongoose.Schema({
  id: String,
  texto: String,
  nivel: Number,
  padre_id: String,
  color: String,
});

const MapaMentalSchema = new mongoose.Schema({
  usuario_id: { type: String, required: true },
  titulo: { type: String, required: true },
  materia: { type: String, default: 'General' },
  nodos: [NodoSchema],
  fecha_creacion: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MapaMental', MapaMentalSchema);