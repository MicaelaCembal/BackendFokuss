const express = require("express");
const router = express.Router();
const SesionEstudio = require("../models/SesionEstudio");

// ÚNICA fuente de verdad de recompensas (alineada con la app)
const RECOMPENSAS = [
    { id: "avatares",    nombre: "Creación de avatar", descripcion: "Elegí tu propio Foki!",                      horas_necesarias: 3 },
    { id: "resumenes",   nombre: "Resúmenes Premium",  descripcion: "Accedé a material destacado!",               horas_necesarias: 5 },
    { id: "foros",       nombre: "Foros de estudio",   descripcion: "Debatí con personas en tu misma situación!", horas_necesarias: 10 },
    { id: "modo_oscuro", nombre: "Modo Oscuro",        descripcion: "Personalizá la app a tu gusto!",             horas_necesarias: 15 },
    { id: "descuento",   nombre: "10% OFF librería",   descripcion: "Que tus esfuerzos den resultados!",          horas_necesarias: 20 },
    { id: "descanso",    nombre: "Día de descanso",    descripcion: "Descansá sin perder tu racha!",              horas_necesarias: 25 },
];

router.get("/:usuarioId", async (req, res) => {
    try {
        const { usuarioId } = req.params;

        // Traemos TODAS las sesiones del usuario y filtramos en JS,
        // para tolerar "completada" guardada como 1, true o "1"
        const sesiones = await SesionEstudio.find({ usuario_id: usuarioId });

        const minutosTotales = sesiones
            .filter((s) => Number(s.completada) === 1)
            .reduce((acc, s) => acc + (Number(s.duracion_minutos) || 0), 0);

        const horasExactas = minutosTotales / 60;       // ej: 2.5
        const horasTotales = Math.floor(horasExactas);  // ej: 2

        const recompensasConEstado = RECOMPENSAS.map((r) => ({
            ...r,
            desbloqueada: horasExactas >= r.horas_necesarias,
        }));

        // Próxima recompensa bloqueada
        const proxima = recompensasConEstado.find((r) => !r.desbloqueada);
        const minutosParaProxima = proxima
            ? Math.max(proxima.horas_necesarias * 60 - minutosTotales, 0)
            : 0;

        res.json({
            horas_totales: horasTotales,
            minutos_totales: minutosTotales,
            horas_para_proxima: Math.ceil(minutosParaProxima / 60),
            minutos_para_proxima: minutosParaProxima,
            proxima_recompensa: proxima || null,
            recompensas: recompensasConEstado,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;