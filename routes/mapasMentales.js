const express = require('express');
const router = express.Router();
const MapaMental = require('../models/MapaMental');
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.get('/:usuarioId', async (req, res) => {
  try {
    const mapas = await MapaMental.find({ usuario_id: req.params.usuarioId }).sort({ fecha_creacion: -1 });
    res.json(mapas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await MapaMental.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Mapa eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No llegó ningún PDF' });

    const { usuario_id } = req.body;
    const pdfBase64 = req.file.buffer.toString('base64');

    const prompt = `
Analizá este PDF y extraé los conceptos principales para armar un mapa mental de estudio.
Detectá automáticamente la materia o tema principal.

Devolvé ÚNICAMENTE un objeto JSON puro sin markdown con este formato exacto:
{
  "materia": "Nombre de la materia detectada",
  "titulo": "Título descriptivo corto del mapa",
  "nodos": [
    { "id": "1", "texto": "Concepto central", "nivel": 0, "padre_id": null, "color": "#7C4DCC" },
    { "id": "2", "texto": "Rama principal 1", "nivel": 1, "padre_id": "1", "color": "#F97316" },
    { "id": "3", "texto": "Subconcepto", "nivel": 2, "padre_id": "2", "color": "#FFCBA4" }
  ]
}

Reglas:
- nivel 0: un solo nodo central
- nivel 1: entre 3 y 6 ramas principales
- nivel 2: entre 1 y 3 subnodos por rama
- Los colores de nivel 1 deben ser distintos entre sí
- Los subnodos del mismo padre heredan el color del padre pero más claro
`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
          ]
        }]
      });
    } catch (err) {
      console.log('Gemini 2.5 ocupado, usando 2.0...');
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
          ]
        }]
      });
    }

    let resultado = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const estructura = JSON.parse(resultado);

    const nuevoMapa = new MapaMental({
      usuario_id,
      titulo: estructura.titulo,
      materia: estructura.materia || 'General',
      nodos: estructura.nodos,
    });

    await nuevoMapa.save();
    res.json({ success: true, mapa: nuevoMapa });

  } catch (error) {
    console.log('ERROR generar mapa PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;