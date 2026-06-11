const express = require('express');
const router = express.Router();
const MapaMental = require('../models/MapaMental');
const Groq = require('groq-sdk');
const multer = require('multer');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

async function extraerTextoPDF(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  let texto = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return texto.slice(0, 8000);
}

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
    const textoPDF = await extraerTextoPDF(req.file.buffer);

    const prompt = `
Analizá el siguiente texto extraído de un PDF y extraé los conceptos principales para armar un mapa mental de estudio.
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
- Los colores de nivel 1 deben ser distintos entre sí: usá #F97316, #22C55E, #3B82F6, #A855F7, #EF4444, #EAB308
- Los subnodos del mismo padre heredan el color del padre pero más claro

Texto del PDF:
${textoPDF}
`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    let resultado = response.choices[0].message.content;
    resultado = resultado.replace(/```json/g, '').replace(/```/g, '').trim();

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