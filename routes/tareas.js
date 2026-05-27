const express = require("express");

const router = express.Router();

const Tarea = require("../models/Tarea");


router.post("/", async (req, res) => {

	try {

		const nuevaTarea = new Tarea(req.body);

		await nuevaTarea.save();

		res.status(201).json(nuevaTarea);

	}
	catch (error) {

		res.status(500).json({
			error: error.message,
		});
	}
});

router.get("/calendario/:usuarioId", async (req, res) => {

	try {

		const tareas = await Tarea.find({

			usuario_id: req.params.usuarioId,

			es_evento: true

		});

		res.json(tareas);

	}
	catch (error) {

		res.status(500).json({

			error: error.message,

		});
	}
});

router.get("/:usuarioId", async (req, res) => {

	try {

		const tareas = await Tarea.find({
			usuario_id: req.params.usuarioId,
		});

		res.json(tareas);

	}
	catch (error) {

		res.status(500).json({
			error: error.message,
		});
	}
});



router.delete("/:id", async (req, res) => {

	try {

		await Tarea.findByIdAndDelete(req.params.id);

		res.json({
			mensaje: "Tarea eliminada",
		});

	}
	catch (error) {

		res.status(500).json({
			error: error.message,
		});
	}
});


router.put("/:id", async (req, res) => {

	try {

		const tareaActualizada = await Tarea.findByIdAndUpdate(
			req.params.id,
			req.body,
			{
				new: true,
			}
		);

		res.json(tareaActualizada);

	}
	catch (error) {

		res.status(500).json({
			error: error.message,
		});
	}
});

module.exports = router;