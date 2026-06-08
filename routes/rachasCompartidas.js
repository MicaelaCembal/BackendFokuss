const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const col = () => mongoose.connection.db.collection("rachas_compartidas");
const usuarios = () => mongoose.connection.db.collection("Usuarios");

const hoy = () => new Date().toISOString().split("T")[0];
const ayer = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
};

// POST enviar solicitud de racha compartida
router.post("/solicitud", async (req, res) => {
    try {
        const { usuarioId, amigoId } = req.body;

        const existe = await col().findOne({
            $or: [
                { usuarioA: usuarioId, usuarioB: amigoId },
                { usuarioA: amigoId, usuarioB: usuarioId }
            ]
        });

        if (existe) return res.status(400).json({ mensaje: "Ya existe una racha entre estos usuarios" });

        const nueva = {
            usuarioA: usuarioId,
            usuarioB: amigoId,
            estado: "pendiente",
            racha: 0,
            ultimo_estudio_A: null,
            ultimo_estudio_B: null,
            fecha_inicio: hoy(),
        };

        await col().insertOne(nueva);
        res.json({ mensaje: "Solicitud enviada", racha: nueva });
    } catch (error) {
        res.status(500).json({ mensaje: "Error enviando solicitud" });
    }
});

// POST aceptar solicitud
router.post("/aceptar", async (req, res) => {
    try {
        const { rachaId } = req.body;
        await col().updateOne(
            { _id: new mongoose.Types.ObjectId(rachaId) },
            { $set: { estado: "activa" } }
        );
        res.json({ mensaje: "Racha aceptada" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error aceptando racha" });
    }
});

// GET rachas de un usuario
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const rachas = await col().find({
            $or: [{ usuarioA: userId }, { usuarioB: userId }],
        }).toArray();

        const rachасConDatos = await Promise.all(rachas.map(async (r) => {
            const amigoId = r.usuarioA === userId ? r.usuarioB : r.usuarioA;
            const amigo = await usuarios().findOne({ _id: amigoId });
            return { ...r, amigo };
        }));

        res.json(rachасConDatos);
    } catch (error) {
        res.status(500).json({ mensaje: "Error obteniendo rachas" });
    }
});

// POST registrar estudio en racha compartida
router.post("/registrar-estudio", async (req, res) => {
    try {
        const { userId } = req.body;
        const fechaHoy = hoy();
        const fechaAyer = ayer();

        const rachas = await col().find({
            $or: [{ usuarioA: userId }, { usuarioB: userId }],
            estado: "activa"
        }).toArray();

        for (const r of rachas) {
            const esA = r.usuarioA === userId;
            const campoPropio = esA ? "ultimo_estudio_A" : "ultimo_estudio_B";
            const campoOtro = esA ? "ultimo_estudio_B" : "ultimo_estudio_A";

            const ultimoPropio = r[campoPropio] || "";
            const ultimoOtro = r[campoOtro] || "";

            if (ultimoPropio === fechaHoy) continue;

            const update = { [campoPropio]: fechaHoy };

            // Si el otro también estudió hoy o ayer, suma racha
            if (ultimoOtro === fechaHoy || ultimoOtro === fechaAyer) {
                const rachaActual = r.racha || 0;
                update.racha = rachaActual + 1;
            } else {
                update.racha = 1;
            }

            await col().updateOne({ _id: r._id }, { $set: update });
        }

        res.json({ mensaje: "Estudio registrado en rachas compartidas" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error registrando estudio" });
    }
});

// GET solicitudes pendientes para un usuario
router.get("/:userId/pendientes", async (req, res) => {
    try {
        const pendientes = await col().find({
            usuarioB: req.params.userId,
            estado: "pendiente"
        }).toArray();

        const conDatos = await Promise.all(pendientes.map(async (r) => {
            const amigo = await usuarios().findOne({ _id: r.usuarioA });
            return { ...r, amigo };
        }));

        res.json(conDatos);
    } catch (error) {
        res.status(500).json({ mensaje: "Error obteniendo pendientes" });
    }
});

module.exports = router;