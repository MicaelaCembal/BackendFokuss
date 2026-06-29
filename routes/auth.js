const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const transporter = {
  sendMail: async (mailOptions) => {
    return emailApi.sendTransacEmail({
      sender: { name: 'Fokuss', email: 'appfokuss@gmail.com' },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html || mailOptions.text,
    });
  }
};

// ─── REGISTRO ────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
    try {
        const { nombre, apellido, email, password, nivel, carrera } = req.body;

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

        const passwordHash = await bcrypt.hash(password, 10);

        const nuevoUsuario = new User({
            nombre,
            apellido,
            email,
            password: passwordHash,
            nivel,
            carrera: nivel === 'universitario' ? carrera : '',
        });

        await nuevoUsuario.save();

        const usuarioRespuesta = nuevoUsuario.toObject();
        delete usuarioRespuesta.password;

        res.json({
            mensaje: 'Usuario creado correctamente',
            usuario: usuarioRespuesta,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const usuario = await User.collection.findOne({ email: email.trim() });

        if (!usuario) {
            return res.status(400).json({ mensaje: 'Usuario no encontrado' });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta) {
            return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        const usuarioSinPassword = { ...usuario };
        delete usuarioSinPassword.password;

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: usuarioSinPassword,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error del servidor' });
    }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(404).json({
                mensaje: 'No existe ningún usuario registrado con ese email.',
            });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracion = new Date(Date.now() + 15 * 60 * 1000);

        await User.collection.updateOne(
            { _id: usuario._id },
            { $set: { resetCodigo: codigo, resetExpira: expiracion } }
        );

        const mailOptions = {
            to: usuario.email,
            subject: 'Código de Recuperación - FOKUSS',
            html: `
                <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #ddd; border-radius: 8px;">
                    <h1 style="color: #0057C8; text-align: center;">FOKUSS</h1>
                    <p>Hola <strong>${usuario.nombre || 'Usuario'}</strong>,</p>
                    <p>Tu código para restablecer la contraseña es:</p>
                    <div style="background-color: #F2F2F2; padding: 15px; text-align: center; font-size: 36px; font-family: monospace; letter-spacing: 8px; border-radius: 6px; border: 1px dashed #B96CFF; font-weight: bold; margin: 20px 0;">
                        ${codigo}
                    </div>
                    <p style="font-size: 12px; color: #666;">Este código expira en 15 minutos.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.json({ mensaje: 'Correo de recuperación enviado correctamente.' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error al enviar el correo de recuperación' });
    }
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ mensaje: 'Faltan datos obligatorios.' });
        }

        const codigoLimpio = token.trim();

        const usuario = await User.collection.findOne({
            resetCodigo: codigoLimpio,
            resetExpira: { $gt: new Date() }
        });

        if (!usuario) {
            return res.status(400).json({ mensaje: 'El código es inválido o ya expiró.' });
        }

        const nuevaPasswordHash = await bcrypt.hash(password, 10);

        await User.collection.updateOne(
            { _id: usuario._id },
            {
                $set: { password: nuevaPasswordHash },
                $unset: { resetCodigo: '', resetExpira: '' }
            }
        );

        res.json({ mensaje: 'Contraseña actualizada con éxito.' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error del servidor.' });
    }
});

// ─── OBTENER TODOS LOS USUARIOS ───────────────────────────────────────────────

router.get('/users', async (req, res) => {
    try {
        const usuarios = await User.find({}).select('-password');
        res.json(usuarios);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error obteniendo usuarios' });
    }
});

// ─── OBTENER USUARIO POR ID ───────────────────────────────────────────────────

router.get('/users/:id', async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id).select('-password');

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error obteniendo usuario' });
    }
});

// ─── ACTUALIZAR USUARIO ───────────────────────────────────────────────────────

router.put('/users/:id', async (req, res) => {
    try {
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, 10);
        }

        const { ObjectId } = require('mongodb');
        let query;
        try { query = { _id: new ObjectId(req.params.id) }; }
        catch { query = { _id: req.params.id }; }

        const usuarioActualizado = await User.collection.findOneAndUpdate(
            query,
            { $set: req.body },
            { returnDocument: 'after' }
        );

        const doc = usuarioActualizado?.value ?? usuarioActualizado;

        if (!doc) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const { password: _, ...sinPassword } = doc;
        res.json({ mensaje: 'Usuario actualizado', usuario: sinPassword });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error actualizando usuario' });
    }
});

// ─── ELIMINAR USUARIO ─────────────────────────────────────────────────────────

router.delete('/users/:id', async (req, res) => {
    try {
        const usuarioEliminado = await User.findByIdAndDelete(req.params.id);

        if (!usuarioEliminado) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error eliminando usuario' });
    }
});

// ─── GUARDAR EXPO PUSH TOKEN ──────────────────────────────────────────────────

router.post('/push-token', async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ mensaje: 'Faltan userId o token' });
        }

        await User.findByIdAndUpdate(userId, { expoPushToken: token });

        res.json({ mensaje: 'Push token guardado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error guardando push token' });
    }
});

module.exports = router;