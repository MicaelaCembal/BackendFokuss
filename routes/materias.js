const express = require('express');
const router = express.Router();
const Materia = require('../models/Materia');

router.get('/:usuarioId', async (req, res) => {
  try {
    const materias = await Materia.find({ usuario_id: req.params.usuarioId });
    res.json(materias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const nueva = new Materia(req.body);
    await nueva.save();
    res.status(201).json(nueva);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Materia.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Materia eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;