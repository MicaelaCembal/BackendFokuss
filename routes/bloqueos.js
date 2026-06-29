const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const usuariosCollection = () => mongoose.connection.db.collection('Usuarios');

// POST bloquear usuario
router.post('/:userId/bloquear', async (req, res) => {
    try {
        const { bloqueadoId } = req.body;
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $addToSet: { bloqueados: bloqueadoId } }
        );
        // Si eran amigos, eliminarlos mutuamente
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $pull: { amigos: bloqueadoId } }
        );
                // Eliminar solicitudes pendientes entre ambos
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $pull: { solicitudes_pendientes: bloqueadoId } }
        );
        await usuariosCollection().updateOne(
            { _id: bloqueadoId },
            { $pull: { solicitudes_pendientes: req.params.userId } }
        );
        res.json({ mensaje: 'Usuario bloqueado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al bloquear usuario' });
    }
});

// DELETE desbloquear usuario
router.delete('/:userId/bloquear/:bloqueadoId', async (req, res) => {
    try {
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $pull: { bloqueados: req.params.bloqueadoId } }
        );
        res.json({ mensaje: 'Usuario desbloqueado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al desbloquear usuario' });
    }
});

// GET lista de bloqueados
router.get('/:userId/bloqueados', async (req, res) => {
    try {
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        const bloqueadosIds = usuario?.bloqueados || [];
        if (bloqueadosIds.length === 0) return res.json([]);
        const bloqueados = await usuariosCollection().find({ _id: { $in: bloqueadosIds } }).toArray();
        res.json(bloqueados);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo bloqueados' });
    }
});

module.exports = router;