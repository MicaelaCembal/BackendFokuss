const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Tarea = require("../models/Tarea");

router.post("/", async (req, res) => {
  console.log("RECIBIDO EN BACKEND (Body):", req.body);
  try {
    const nuevaTarea = new Tarea(req.body);
    await nuevaTarea.save();
    res.status(201).json(nuevaTarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/calendario/:usuarioId", async (req, res) => {
  try {
    const tareas = await Tarea.find({
      usuario_id: req.params.usuarioId,
      es_evento: true
    });
    res.json(tareas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:usuarioId", async (req, res) => {
  try {
    const tareas = await Tarea.find({ usuario_id: req.params.usuarioId });

    console.log("GET DEVUELVE:");
    tareas.slice(0, 5).forEach(t => {
      console.log({ id: t._id.toString(), titulo: t.titulo });
    });

    res.json(tareas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await Tarea.collection.findOneAndDelete({ _id: req.params.id });

    if (!result) {
      const resultObj = await Tarea.collection.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(req.params.id)
      }).catch(() => null);

      if (!resultObj) {
        return res.status(404).json({ mensaje: "Tarea no encontrada" });
      }
    }

    res.json({ mensaje: "Tarea eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const updateData = { ...req.body };
    if (req.body.estado === "completada") {
      updateData.fecha_completada = new Date();
    } else if (req.body.estado === "pendiente") {
      updateData.fecha_completada = null;
    }

    let tarea = await Tarea.collection.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!tarea && mongoose.Types.ObjectId.isValid(id)) {
      tarea = await Tarea.collection.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: updateData },
        { returnDocument: "after" }
      );
    }

    if (!tarea) {
      return res.status(404).json({ mensaje: "Tarea no encontrada" });
    }

    res.json(tarea);

  } catch (error) {
    console.log("Error PUT tarea:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;