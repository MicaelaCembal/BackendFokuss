const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const User = require('../models/User');

const { Resend } = require('resend');

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


const verificarToken = (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader) {
			return res.status(401).json({ mensaje: 'Acceso denegado. Token requerido.' });
		}

		// El token suele venir como "Bearer eyJhbGci..." -> Sacamos el "Bearer "
		const token = authHeader.replace('Bearer ', '');
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		
		req.user = decoded; // Guardamos los datos del usuario en la petición (id, email)
		next();
	} catch (error) {
		return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
	}
};

// ─── REGISTRO (CON ENCRIPTACIÓN BCRYPT) ───────────────────────────────────────

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

		// Encriptamos la contraseña antes de guardarla
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

		// Quitamos la contraseña del objeto de respuesta por seguridad
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

// ─── LOGIN (VERIFICACIÓN BCRYPT + GENERACIÓN JWT) ─────────────────────────────

router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;

		const usuario = await User.findOne({ email });

		if (!usuario) {
			return res.status(400).json({
				mensaje: 'Usuario no encontrado',
			});
		}

		// Comparamos la contraseña en texto plano con el hash de la BD
		const passwordCorrecta = await bcrypt.compare(password, usuario.password);

		if (!passwordCorrecta) {
			return res.status(400).json({
				mensaje: 'Contraseña incorrecta',
			});
		}

		// Generamos el token JWT válido por 30 días
		const token = jwt.sign(
			{ id: usuario._id, email: usuario.email },
			process.env.JWT_SECRET,
			{ expiresIn: '30d' }
		);

		// Quitamos la contraseña antes de mandar el usuario al frontend
		const usuarioSinPassword = usuario.toObject();
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

// ─── SOLICITAR RECUPERACIÓN DE CONTRASEÑA ─────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
	try {
		const { email } = req.body;

		const usuario = await User.findOne({ email });
		if (!usuario) {
			return res.status(404).json({
				mensaje: 'No existe ningún usuario registrado con ese email.',
			});
		}

		// Token temporal de 15 minutos para recuperar la clave
		// ... (Dentro de router.post('/forgot-password'))
const tokenTemporal = jwt.sign(
    { id: usuario._id },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
);

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: usuario.email,
    subject: 'Código de Recuperación - FOKUSS',
    html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #0057C8; text-align: center;">FOKUSS</h1>
            <p>Hola <strong>${usuario.nombre || 'Usuario'}</strong>,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña. Copiá el siguiente token de seguridad e ingresalo en la aplicación:</p>
            <div style="background-color: #F2F2F2; padding: 15px; text-align: center; font-size: 14px; font-family: monospace; word-break: break-all; border-radius: 6px; border: 1px dashed #B96CFF; font-weight: bold; margin: 20px 0;">
                ${tokenTemporal}
            </div>
            <p style="font-size: 12px; color: #666;">Este token es confidencial y va a expirar automáticamente en 15 minutos.</p>
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

// ─── CONFIGURAR NUEVA CONTRASEÑA ──────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
	try {
		const { token, passwordNueva } = req.body;

		if (!token || !passwordNueva) {
			return res.status(400).json({ mensaje: 'Faltan datos obligatorios.' });
		}

		// Validamos el token temporal
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const usuario = await User.findById(decoded.id);
		if (!usuario) {
			return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
		}

		// Hasheamos la nueva contraseña elegida
		const nuevaPasswordHash = await bcrypt.hash(passwordNueva, 10);
		
		usuario.password = nuevaPasswordHash;
		await usuario.save();

		res.json({ mensaje: 'Contraseña actualizada con éxito.' });

	} catch (error) {
		console.log(error);
		return res.status(400).json({
			mensaje: 'El enlace es inválido o ya expiró.',
		});
	}
});

// ─── OBTENER TODOS LOS USUARIOS (Ruta Protegida) ──────────────────────────────

router.get('/users', verificarToken, async (req, res) => {
	try {
		// Traemos todos los usuarios ocultando sus contraseñas
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
		// Si el usuario decide actualizar su contraseña desde su perfil, la hasheamos primero
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