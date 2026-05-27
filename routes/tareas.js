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

		const tarea = await Tarea.findById(req.params.id);

		if (!tarea) {

			return res.status(404).json({
				mensaje: "Tarea no encontrada",
			});

		}

		if (!tarea.es_evento) {

			return res.status(400).json({
				mensaje: "Solo se pueden eliminar eventos del calendario desde esta ruta",
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

		const tarea = await Tarea.findById(req.params.id);

		if (!tarea) {

			return res.status(404).json({
				mensaje: "Tarea no encontrada",
			});

		}

		if (!tarea.es_evento) {

			return res.status(400).json({
				mensaje: "Solo se pueden editar eventos del calendario desde esta ruta",
			});

		}

		tarea.usuario_id = req.body.usuario_id ?? tarea.usuario_id;
		tarea.titulo = req.body.titulo ?? tarea.titulo;
		tarea.descripcion = req.body.descripcion ?? tarea.descripcion;
		tarea.tipo = req.body.tipo ?? tarea.tipo;
		tarea.materia = req.body.materia ?? tarea.materia;
		tarea.prioridad = req.body.prioridad ?? tarea.prioridad;
		tarea.estado = req.body.estado ?? tarea.estado;
		tarea.fecha_vencimiento = req.body.fecha_vencimiento ?? tarea.fecha_vencimiento;
		tarea.hora_inicio = req.body.hora_inicio ?? tarea.hora_inicio;
		tarea.hora_fin = req.body.hora_fin ?? tarea.hora_fin;
		tarea.es_evento = typeof req.body.es_evento === "boolean" ? req.body.es_evento : tarea.es_evento;
		tarea.recordatorio = typeof req.body.recordatorio === "boolean" ? req.body.recordatorio : tarea.recordatorio;
		tarea.repetir = req.body.repetir ?? tarea.repetir;
		tarea.notas = req.body.notas ?? tarea.notas;

		const tareaActualizada = await tarea.save();

		res.json(tareaActualizada);

	}
	catch (error) {

		res.status(500).json({
			error: error.message,
		});
	}
});

module.exports = router;