const express = require("express");

const router = express.Router();

const Tarea = require("../models/Tarea");


router.post("/", async (req, res) => {
	console.log("📥 RECIBIDO EN BACKEND (Body):", req.body);

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

		console.log(
			"GET DEVUELVE:"
		);

		tareas.slice(0,5).forEach(t => {

			console.log({
				id: t._id.toString(),
				titulo: t.titulo
			});

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

		const tarea = await Tarea.findById(req.params.id);

		if (!tarea) {

			return res.status(404).json({
				mensaje: "Tarea no encontrada",
			});

		}

		

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

		const tarea = await Tarea.findOneAndUpdate(

			{ _id: req.params.id },

			{
				$set: req.body
			},

			{
				new: true
			}

		);

		if (!tarea) {

			return res.status(404).json({
				mensaje: "Tarea no encontrada"
			});

		}

		res.json(tarea);

	}
	catch (error) {

		res.status(500).json({
			error: error.message
		});

	}

});

module.exports = router;