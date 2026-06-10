const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Resend } = require('resend');

// Inicializamos Resend con tu API Key real para saltear el bloqueo de Render
const resend = new Resend('re_2xQU7aYk_FuLSbLsuquQJK71F9WqUScuG');

const transporter = {
  sendMail: async (mailOptions) => {
    return resend.emails.send({
      from: 'Fokuss <onboarding@resend.dev>', 
      to: mailOptions.to,                   
      subject: mailOptions.subject,
      html: mailOptions.html || mailOptions.text
    });
  }
};

// Middleware para proteger rutas con JWT
const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ mensaje: 'Acceso denegado. Token requerido.' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
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
// ─── LOGIN (SOLUCIONADO CON COLECCIÓN NATIVA) ─────────────────────────────

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscamos directo en la coleccion nativa sin pasar por los filtros de Mongoose
        const usuario = await User.collection.findOne({ email: email.trim() });

        if (!usuario) {
            return res.status(400).json({
                mensaje: 'Usuario no encontrado',
            });
        }

        // Comparamos la contraseña enviada con el hash real de Atlas
        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta) {
            return res.status(400).json({
                mensaje: 'Contraseña incorrecta',
            });
        }

        // Generamos el token JWT
        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Limpiamos la password antes de responder
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

router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ mensaje: 'Faltan datos obligatorios.' });
        }

        const codigoLimpio = token.trim();

        // Buscamos el usuario que tenga ese código y que no haya expirado
        const usuario = await User.collection.findOne({
            resetCodigo: codigoLimpio,
            resetExpira: { $gt: new Date() }
        });

        if (!usuario) {
            return res.status(400).json({ 
                mensaje: 'El código es inválido o ya expiró.' 
            });
        }

        const nuevaPasswordHash = await bcrypt.hash(password, 10);

        // Actualizamos la password y borramos el código usado
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


router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(404).json({
                mensaje: 'No existe ningún usuario registrado con ese email.',
            });
        }

        // Código numérico de 6 dígitos, mucho más simple de copiar
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Guardamos el código y su expiración en el usuario
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

// ─── OBTENER TODOS LOS USUARIOS (Ruta Protegida) ──────────────────────────────

router.get('/users', verificarToken, async (req, res) => {
    try {
        const usuarios = await User.find({}).select('-password');
        res.json(usuarios);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error obteniendo usuarios' });
    }
});

// ─── OBTENER USUARIO POR ID (Ruta Protegida) ──────────────────────────────────

router.get('/users/:id', verificarToken, async (req, res) => {
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

// ─── ACTUALIZAR USUARIO (Ruta Protegida) ──────────────────────────────────────

router.put('/users/:id', verificarToken, async (req, res) => {
    try {
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, 10);
        }

        const usuarioActualizado = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).select('-password');

        if (!usuarioActualizado) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json({
            mensaje: 'Usuario actualizado',
            usuario: usuarioActualizado,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: 'Error actualizando usuario' });
    }
});

// ─── ELIMINAR USUARIO (Ruta Protegida) ────────────────────────────────────────

router.delete('/users/:id', verificarToken, async (req, res) => {
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