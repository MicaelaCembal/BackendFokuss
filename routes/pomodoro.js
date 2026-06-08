const express = require("express");
const router = express.Router();
const SesionEstudio = require("../models/SesionEstudio");
const mongoose = require("mongoose");

const usuariosCollection = () => mongoose.connection.db.collection("Usuarios");

const hoy = () => new Date().toISOString().split("T")[0];
const ayer = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
};

router.post("/", async (req, res) => {
    try {
        const sesion = new SesionEstudio(req.body);
        await sesion.save();

        if (req.body.completada && req.body.usuario_id) {
            const usuario = await usuariosCollection().findOne({ _id: req.body.usuario_id });

            if (usuario) {
                const ultimoEstudio = usuario.ultimo_estudio || "";
                const fechaHoy = hoy();
                const fechaAyer = ayer();

                let nuevaRacha = usuario.racha_actual || 0;

                if (ultimoEstudio === fechaHoy) {
                    // Ya estudió hoy, no cambia nada
                } else if (ultimoEstudio === fechaAyer) {
                    // Estudió ayer, suma 1
                    nuevaRacha += 1;
                } else {
                    // No estudió ayer, resetea
                    nuevaRacha = 1;
                }

                const nuevaRachaMaxima = Math.max(nuevaRacha, usuario.racha_maxima || 0);

                await usuariosCollection().updateOne(
                    { _id: req.body.usuario_id },
                    {
                        $set: {
                            racha_actual: nuevaRacha,
                            racha_maxima: nuevaRachaMaxima,
                            ultimo_estudio: fechaHoy,
                        }
                    }
                );
                
                // Registrar en rachas compartidas
                await mongoose.connection.db.collection("rachas_compartidas").find({
                    $or: [{ usuarioA: req.body.usuario_id }, { usuarioB: req.body.usuario_id }],
                    estado: "activa"
                }).toArray().then(async (rachas) => {
                    const fechaAyer = ayer();
                    for (const r of rachas) {
                        const esA = r.usuarioA === req.body.usuario_id;
                        const campoPropio = esA ? "ultimo_estudio_A" : "ultimo_estudio_B";
                        const campoOtro = esA ? "ultimo_estudio_B" : "ultimo_estudio_A";
                        const ultimoPropio = r[campoPropio] || "";
                        const ultimoOtro = r[campoOtro] || "";
                        if (ultimoPropio === fechaHoy) continue;
                        const update = { [campoPropio]: fechaHoy };
                        if (ultimoOtro === fechaHoy || ultimoOtro === fechaAyer) {
                            update.racha = (r.racha || 0) + 1;
                        } else {
                            update.racha = 1;
                        }
                        await mongoose.connection.db.collection("rachas_compartidas").updateOne(
                            { _id: r._id },
                            { $set: update }
                        );
                    }
                });
            }
        }

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