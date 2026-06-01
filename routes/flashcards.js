const express = require("express");

const router = express.Router();

const Flashcard = require("../models/Flashcard");

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY
});

const multer = require("multer");

const upload = multer({
	storage: multer.memoryStorage()
});

console.log("GEMINI:", process.env.GEMINI_API_KEY);

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

        const flashcards = await Flashcard.find({
            usuario_id: req.params.usuarioId
        });

        res.json(flashcards);

    } catch (error) {

        res.status(500).json(error);

    }

});

router.delete("/:id", async (req, res) => {

    try {

        await Flashcard.findByIdAndDelete(
            req.params.id
        );

        res.json({
            mensaje: "Flashcard eliminada"
        });

    } catch (error) {

        res.status(500).json(error);

    }

});

router.post("/generar", async (req, res) => {

	try {

		const {
			usuario_id,
			materia,
			texto
		} = req.body;

		const prompt = `
Generá flashcards de estudio.

Respondé únicamente JSON.

Formato:

[
	{
		"pregunta":"...",
		"respuesta":"..."
	}
]

Texto:

${texto}
`;

		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: prompt
		});

		let resultado = response.text;

		resultado = resultado
			.replace(/```json/g, "")
			.replace(/```/g, "")
			.trim();

		const cards = JSON.parse(resultado);

		const flashcardsGuardadas = [];

		for (const card of cards) {

			const nuevaFlashcard = new Flashcard({

				usuario_id,

				materia,

				pregunta: card.pregunta,

				respuesta: card.respuesta

			});

			await nuevaFlashcard.save();

			flashcardsGuardadas.push(
				nuevaFlashcard
			);

		}

		res.json({

			success: true,

			total: flashcardsGuardadas.length,

			flashcards: flashcardsGuardadas

		});

	} catch (error) {

		console.log(error);

		res.status(500).json({
			success: false,
			error: error.message
		});

	}

});

router.post(
	"/generar-imagen",
	upload.single("imagen"),
	async (req, res) => {

		try {

			if (!req.file) {

				return res.status(400).json({
					success: false,
					error: "No llegó ninguna imagen"
				});

			}

			const {
				usuario_id,
				materia
			} = req.body;

			const imagenBase64 =
				req.file.buffer.toString("base64");

			const prompt = `
Analiza la imagen.

Extrae toda la información importante.

Genera flashcards de estudio.

Devuelve SOLO JSON.

[
	{
		"pregunta":"...",
		"respuesta":"..."
	}
]
`;

			let response;

			try {

				response =
					await ai.models.generateContent({

						model: "gemini-2.5-flash",

						contents: [
							{
								role: "user",
								parts: [
									{
										text: prompt
									},
									{
										inlineData: {
											mimeType:
												req.file.mimetype,
											data:
												imagenBase64
										}
									}
								]
							}
						]

					});

			} catch (error) {

				console.log(
					"Gemini 2.5 ocupado, usando Gemini 2.0..."
				);

				response =
					await ai.models.generateContent({

						model: "gemini-2.0-flash",

						contents: [
							{
								role: "user",
								parts: [
									{
										text: prompt
									},
									{
										inlineData: {
											mimeType:
												req.file.mimetype,
											data:
												imagenBase64
										}
									}
								]
							}
						]

					});

			}

			let resultado =
				response.text;

			resultado = resultado
				.replace(/```json/g, "")
				.replace(/```/g, "")
				.trim();

			const cards =
				JSON.parse(resultado);

			const flashcardsGuardadas = [];

			for (const card of cards) {

				const nuevaFlashcard =
					new Flashcard({

						usuario_id,

						materia,

						pregunta:
							card.pregunta,

						respuesta:
							card.respuesta

					});

				await nuevaFlashcard.save();

				flashcardsGuardadas.push(
					nuevaFlashcard
				);

			}

			res.json({

				success: true,

				total:
					flashcardsGuardadas.length,

				flashcards:
					flashcardsGuardadas

			});

		} catch (error) {

			console.log(
				"ERROR GENERAR IMAGEN:"
			);

			console.log(error);

			res.status(500).json({

				success: false,

				error:
					error.message,

				stack:
					error.stack

			});

		}

	}
);

router.post(
	"/test-imagen",
	upload.single("imagen"),
	(req, res) => {

		console.log("ENTRO");

		res.json({
			ok: true,
			body: req.body,
			file: req.file ? true : false
		});

	}
);

module.exports = router;