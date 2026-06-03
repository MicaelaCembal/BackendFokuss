const express = require('express');
const router = express.Router();

const User = require('../models/User');

router.post('/register', async (req, res) => {

    try {

        const {
            nombre,
            apellido,
            email,
            password,
            nivel,
            carrera,
        } = req.body;

        if (!nombre || !apellido || !email || !password || !nivel) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios para registrar el usuario',
            });
        }

        const usuarioExiste = await User.findOne({ email });

        if (usuarioExiste) {

            return res.status(400).json({
                mensaje: 'El usuario ya existe',
            });

        }

        const nuevoUsuario = new User({
            nombre,
            apellido,
            email,
            password,
            nivel,
            carrera: nivel === 'universitario' ? carrera : '',
        });

        await nuevoUsuario.save();

        res.json({
            mensaje: 'Usuario creado correctamente',
            usuario: nuevoUsuario,
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: 'Error del servidor',
        });

    }

});

router.post('/login', async (req, res) => {

    try {

        const { email, password } = req.body;

        const usuario = await User.findOne({ email });

        if (!usuario) {

            return res.status(400).json({
                mensaje: 'Usuario no encontrado',
            });

        }

        if (usuario.password !== password) {

            return res.status(400).json({
                mensaje: 'Contraseña incorrecta',
            });

        }

        res.json({
            mensaje: 'Login exitoso',
            usuario,
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: 'Error del servidor',
        });

    }

});

router.get('/users', async (req, res) => {

    try {

        const usuarios = await User.find({});

        res.json(usuarios);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: 'Error obteniendo usuarios',
        });

    }

});

router.get('/users/:id', async (req, res) => {

    try {

        const usuario = await User.findById(req.params.id);

        if (!usuario) {

            return res.status(404).json({
                mensaje: 'Usuario no encontrado',
            });

        }

        res.json(usuario);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: 'Error obteniendo usuario',
        });

    }

});

router.put('/users/:id', async (req, res) => {

    try {

        const usuarioActualizado = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
            }
        );

        if (!usuarioActualizado) {

            return res.status(404).json({
                mensaje: 'Usuario no encontrado',
            });

        }

        res.json({
            mensaje: 'Usuario actualizado',
            usuario: usuarioActualizado,
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: 'Error actualizando usuario',
        });

    }

});

router.delete('/users/:id', async (req, res) => {

    try {

        const usuarioEliminado = await User.findByIdAndDelete(
            req.params.id
        );

        if (!usuarioEliminado) {

            return res.status(404).json({
                mensaje: 'Usuario no encontrado',
            });

        }

        res.json({
            mensaje: 'Usuario eliminado correctamente',
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            mensaje: 'Error eliminando usuario',
        });

    }

});

module.exports = router;