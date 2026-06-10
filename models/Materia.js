const mongoose = require('mongoose');

const MateriaSchema = new mongoose.Schema({
  usuario_id: { type: String, required: true },
  nombre: { type: String, required: true },
  color: { type: String, default: '#DDB7FF' },
  creada_en: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Materia', MateriaSchema);