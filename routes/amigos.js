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

// GET sugerencias
router.get('/:userId/sugerencias', async (req, res) => {
    try {
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigosIds = usuario.amigos || [];
        const sugerencias = await usuariosCollection().find({
            _id: { $nin: [...amigosIds, req.params.userId] }
        }).toArray();
        res.json(sugerencias);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error obteniendo sugerencias' });
    }
});

// GET buscar amigo por nombre/email
router.get('/:userId/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        const normalizar = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const qNormalizado = normalizar(q);

        const todos = await usuariosCollection().find({}).toArray();
        const resultados = todos.filter(u => {
            const nombre = normalizar(u.nombre || '');
            const apellido = normalizar(u.apellido || '');
            const email = normalizar(u.email || '');
            return nombre.includes(qNormalizado) || apellido.includes(qNormalizado) || email.includes(qNormalizado);
        });

        res.json(resultados);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error buscando usuarios' });
    }
});

// POST agregar amigo
router.post('/:userId/agregar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = usuario.amigos || [];
        if (amigos.includes(amigoId)) {
            return res.status(400).json({ mensaje: 'Ya son amigos' });
        }

        amigos.push(amigoId);
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { amigos } }
        );
        res.json({ mensaje: 'Amigo agregado', amigos });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error agregando amigo' });
    }
});

// DELETE eliminar amigo
router.delete('/:userId/eliminar', async (req, res) => {
    try {
        const { amigoId } = req.body;
        const usuario = await usuariosCollection().findOne({ _id: req.params.userId });
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const amigos = (usuario.amigos || []).filter(id => id !== amigoId);
        await usuariosCollection().updateOne(
            { _id: req.params.userId },
            { $set: { amigos } }
        );
        res.json({ mensaje: 'Amigo eliminado', amigos });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error eliminando amigo' });
    }
});

module.exports = router;