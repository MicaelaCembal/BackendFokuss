const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const SesionEstudio = require("../models/SesionEstudio");

const RECOMPENSAS = [
    {
        id: "avatares",
        nombre: "Creación de avatares",
        descripcion: "Desbloqueás todos los avatares de Foki en tu perfil",
        horas_necesarias: 8,
    },
    {
        id: "resumenes_premium",
        nombre: "Resúmenes premium",
        descripcion: "Accedés a resúmenes generados por IA",
        horas_necesarias: 20,
    },
    {
        id: "modo_oscuro",
        nombre: "Modo oscuro",
        descripcion: "Activá el tema oscuro en la app",
        horas_necesarias: 50,
    },
];

router.get("/:usuarioId", async (req, res) => {
    try {
        const { usuarioId } = req.params;

        const sesiones = await SesionEstudio.find({
            usuario_id: usuarioId,
            completada: 1,
        });

        const minutosTotales = sesiones.reduce(
            (acc, s) => acc + (s.duracion_minutos || 0),
            0
        );
        const horasTotales = Math.floor(minutosTotales / 60);

        const recompensasConEstado = RECOMPENSAS.map((r) => ({
            ...r,
            desbloqueada: horasTotales >= r.horas_necesarias,
        }));

        // Próxima recompensa bloqueada
        const proxima = recompensasConEstado.find((r) => !r.desbloqueada);
        const horasParaProxima = proxima
            ? proxima.horas_necesarias - horasTotales
            : 0;

        res.json({
            horas_totales: horasTotales,
            minutos_totales: minutosTotales,
            horas_para_proxima: horasParaProxima,
            proxima_recompensa: proxima || null,
            recompensas: recompensasConEstado,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;