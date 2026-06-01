const express = require("express");

const router = express.Router();

const SesionEstudio = require("../models/SesionEstudio");

router.post("/", async (req, res) => {

    try {

        const sesion = new SesionEstudio(req.body);

        await sesion.save();

        res.status(201).json(sesion);

    } catch (error) {

        res.status(500).json(error);

    }

});

router.get("/:usuarioId", async (req, res) => {

    try {

        const sesiones = await SesionEstudio.find({

            usuario_id: req.params.usuarioId,

            metodo: "pomodoro"

        });

        res.json(sesiones);

    } catch (error) {

        res.status(500).json(error);

    }

});

module.exports = router;