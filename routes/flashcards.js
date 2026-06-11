const express = require("express");
const router = express.Router();
const Flashcard = require("../models/Flashcard");
const Groq = require("groq-sdk");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });

console.log("GROQ API KEY STATUS:", process.env.GROQ_API_KEY ? "OK" : "MISSING");

async function llamarGroq(prompt) {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  let resultado = response.choices[0].message.content;
  resultado = resultado.replace(/```json/g, "").replace(/```/g, "").trim();
  return resultado;
}

router.post("/", async (req, res) => {
  try {
    const flashcard = new Flashcard(req.body);
    await flashcard.save();
    res.status(201).json(flashcard);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/:usuarioId", async (req, res) => {
  try {
    const flashcards = await Flashcard.find({ usuario_id: req.params.usuarioId });
    res.json(flashcards);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Flashcard.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Flashcard eliminada" });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post("/generar", async (req, res) => {
  try {
    const { usuario_id, texto } = req.body;

    const prompt = `
Analiza el siguiente texto y determina automáticamente cuál es la materia o tema principal corta (ej. "Historia", "Física", "Programación").
Luego genera flashcards de estudio.

Respondé únicamente en formato JSON puro, sin decoraciones de código markdown.
Formato esperado:
{
    "materia": "Nombre de la materia detectada",
    "cards": [
        {
            "pregunta": "...",
            "respuesta": "..."
        }
    ]
}

Texto:
${texto}
`;

    const resultado = await llamarGroq(prompt);
    const estructuraEfectiva = JSON.parse(resultado);
    const materiaDetectada = estructuraEfectiva.materia || "General";
    const grupo = materiaDetectada + "-" + Date.now();
    const flashcardsGuardadas = [];

    for (const card of estructuraEfectiva.cards) {
      const nuevaFlashcard = new Flashcard({
        usuario_id,
        materia: materiaDetectada,
        grupo,
        pregunta: card.pregunta,
        respuesta: card.respuesta,
      });
      await nuevaFlashcard.save();
      flashcardsGuardadas.push(nuevaFlashcard);
    }

    res.json({ success: true, total: flashcardsGuardadas.length, flashcards: flashcardsGuardadas });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/generar-imagen", upload.single("imagen"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No llegó ninguna imagen" });

    const { usuario_id } = req.body;

    // Groq no procesa imágenes directamente con llama — usamos vision con llama-4
    const imagenBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza la imagen de los apuntes y deduce inteligentemente cuál es la materia o tema académico principal usando un título corto (ej: "Anatomía", "Química", "Literatura").
Extrae la información importante y genera flashcards de estudio.

Devuelve estrictamente un objeto JSON puro sin markdown con este formato exacto:
{
    "materia": "Nombre de la materia detectada",
    "cards": [
        {
            "pregunta": "...",
            "respuesta": "..."
        }
    ]
}`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imagenBase64}` },
            },
          ],
        },
      ],
    });

    let resultado = response.choices[0].message.content;
    resultado = resultado.replace(/```json/g, "").replace(/```/g, "").trim();

    const estructuraEfectiva = JSON.parse(resultado);
    const materiaDetectada = estructuraEfectiva.materia || "General";
    const grupo = materiaDetectada + "-" + Date.now();
    const flashcardsGuardadas = [];

    for (const card of estructuraEfectiva.cards) {
      const nuevaFlashcard = new Flashcard({
        usuario_id,
        materia: materiaDetectada,
        grupo,
        pregunta: card.pregunta,
        respuesta: card.respuesta,
      });
      await nuevaFlashcard.save();
      flashcardsGuardadas.push(nuevaFlashcard);
    }

    res.json({ success: true, total: flashcardsGuardadas.length, flashcards: flashcardsGuardadas });
  } catch (error) {
    console.log("ERROR GENERAR IMAGEN:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/historial/:usuarioId", async (req, res) => {
  try {
    const historial = await Flashcard.aggregate([
      {
        $match: {
          usuario_id: req.params.usuarioId,
          grupo: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$grupo",
          materia: { $first: "$materia" },
          cantidad: { $sum: 1 },
          flashcards: {
            $push: { _id: "$_id", pregunta: "$pregunta", respuesta: "$respuesta" },
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    res.json(historial);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

router.post("/test-imagen", upload.single("imagen"), (req, res) => {
  res.json({ ok: true, body: req.body, file: req.file ? true : false });
});

router.get("/grupo/:grupo", async (req, res) => {
  try {
    const flashcards = await Flashcard.find({ grupo: req.params.grupo });
    res.json(flashcards);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/debug-grupos/:usuarioId", async (req, res) => {
  const docs = await Flashcard.find({ usuario_id: req.params.usuarioId });
  res.json(docs.map((x) => x.grupo));
});

router.get("/debug/:usuarioId", async (req, res) => {
  const docs = await Flashcard.find({ usuario_id: req.params.usuarioId });
  res.json({ cantidad: docs.length, primerDoc: docs[0] });
});

module.exports = router;