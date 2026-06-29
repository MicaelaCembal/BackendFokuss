const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const usuariosCollection = () => mongoose.connection.db.collection('Usuarios');

// GET mis amigos
router.get('/:userId', async (req, res) => {
    try {
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = await usuariosCollection().find({ _id: { $in: usuario.amigos || [] } }).toArray();
        res.json(amigos);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo amigos' });
    }
});

// GET sugerencias (amigos de amigos + random)
router.get('/:userId/sugerencias', async (req, res) => {
    try {
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigosIds = usuario.amigos || [];
        const excluir = [...amigosIds, req.params.userId];

        const amigosDeAmigos = [];
        for (const amigoId of amigosIds) {
            const amigo = await usuariosCollection().findOne({ _id: amigoId });
            const susAmigos = amigo?.amigos || [];
            for (const id of susAmigos) {
                if (!excluir.includes(id) && !amigosDeAmigos.includes(id)) {
                    amigosDeAmigos.push(id);
                }
            }
        }

        const sugerenciasAmigosDeAmigos = await usuariosCollection().find({
            _id: { $in: amigosDeAmigos }
        }).toArray();

        const yaIncluidos = [...excluir, ...amigosDeAmigos];
        const random = await usuariosCollection().find({
            _id: { $nin: yaIncluidos }
        }).limit(10).toArray();

        const resultado = [...sugerenciasAmigosDeAmigos, ...random].slice(0, 10);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo sugerencias' });
    }
});

// GET buscar amigo por nombre/email
router.get('/:userId/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const normalizar = (str) =>
            (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const qNormalizado = normalizar(q);

        const usuarioActual = await usuariosCollection().findOne({ _id: req.params.userId });
        const bloqueados = usuarioActual?.bloqueados || [];

        const todos = await usuariosCollection()
            .find({ _id: { $ne: req.params.userId, $nin: bloqueados } })
            .toArray();

        const resultados = todos.filter(u => {
            if ((u.bloqueados || []).includes(req.params.userId)) return false;
            const nombre = normalizar(u.nombre);
            const apellido = normalizar(u.apellido);
            const email = normalizar(u.email);
            return (
                nombre.includes(qNormalizado) ||
                apellido.includes(qNormalizado) ||
                email.includes(qNormalizado)
            );
        });

        res.json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error buscando usuarios' });
    }
});

// POST enviar solicitud de amistad
router.post('/:userId/solicitud', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        const amigo = await usuariosCollection().findOne({ _id: amigoId });

        if (!usuario || !amigo) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = usuario.amigos || [];
        if (amigos.includes(amigoId)) return res.status(400).json({ mensaje: 'Ya son amigos' });

        const solicitudesPendientes = amigo.solicitudes_pendientes || [];
        if (solicitudesPendientes.includes(req.params.userId)) {
            return res.status(400).json({ mensaje: 'Ya existe una solicitud pendiente' });
        }

        solicitudesPendientes.push(req.params.userId);
        await usuariosCollection().updateOne(
            { _id: amigoId },
            { $set: { solicitudes_pendientes: solicitudesPendientes } }
        );

        res.json({ mensaje: 'Solicitud enviada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error enviando solicitud' });
    }
});

// POST aceptar solicitud
router.post('/:userId/aceptar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = usuario.amigos || [];
        if (!amigos.includes(amigoId)) amigos.push(amigoId);

        const amigo = await usuariosCollection().findOne({ _id: amigoId });
        const amigosDeAmigo = amigo?.amigos || [];
        if (!amigosDeAmigo.includes(req.params.userId)) amigosDeAmigo.push(req.params.userId);

        const solicitudes = (usuario.solicitudes_pendientes || []).filter(id => id !== amigoId);

        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { amigos, solicitudes_pendientes: solicitudes } }
        );
        await usuariosCollection().updateOne(
            { _id: amigoId },
            { $set: { amigos: amigosDeAmigo } }
        );

        res.json({ mensaje: 'Solicitud aceptada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error aceptando solicitud' });
    }
});

// POST rechazar solicitud
router.post('/:userId/rechazar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const solicitudes = (usuario.solicitudes_pendientes || []).filter(id => id !== amigoId);
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { solicitudes_pendientes: solicitudes } }
        );

        res.json({ mensaje: 'Solicitud rechazada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error rechazando solicitud' });
    }
});

// GET solicitudes pendientes
router.get('/:userId/solicitudes', async (req, res) => {
    try {
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const solicitudesIds = usuario.solicitudes_pendientes || [];
        const solicitudes = await usuariosCollection().find({ _id: { $in: solicitudesIds } }).toArray();
        res.json(solicitudes);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo solicitudes' });
    }
});

// DELETE eliminar amigo (mutuo + elimina racha compartida)
router.delete('/:userId/eliminar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        // Eliminar de los dos lados
        const amigos = (usuario.amigos || []).filter(id => id !== amigoId);
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { amigos } }
        );

        const amigo = await usuariosCollection().findOne({ _id: amigoId });
        if (amigo) {
            const amigosDeAmigo = (amigo.amigos || []).filter(id => id !== req.params.userId);
            await usuariosCollection().updateOne(
                { _id: amigoId },
                { $set: { amigos: amigosDeAmigo } }
            );
        }

        // Eliminar racha compartida si existe
        await mongoose.connection.db.collection('rachas_compartidas').deleteOne({
            $or: [
                { usuarioA: req.params.userId, usuarioB: amigoId },
                { usuarioA: amigoId, usuarioB: req.params.userId }
            ]
        });

        res.json({ mensaje: 'Amigo eliminado' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error eliminando amigo' });
    }
});

// GET solicitudes enviadas por el usuario
router.get('/:userId/solicitudes-enviadas', async (req, res) => {
    try {
        const todos = await usuariosCollection().find({
            solicitudes_pendientes: req.params.userId
        }).toArray();
        const ids = todos.map(u => u._id);
        res.json(ids);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo solicitudes enviadas' });
    }
});

module.exports = router;