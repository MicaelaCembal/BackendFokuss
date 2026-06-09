const cron = require("node-cron");
const { Expo } = require("expo-server-sdk");
const User = require("../models/User");
const Tarea = require("../models/Tarea");

const expo = new Expo();

// Definición de los recordatorios: cuántos días antes y qué mensaje
const RECORDATORIOS = [
	{
		diasAntes: 15,
		titulo: (materia) => `📚 Examen de ${materia}`,
		cuerpo: (materia) =>
			`Tomate 5 min para organizar tu estudio para el examen de ${materia}`,
	},
	{
		diasAntes: 7,
		titulo: (materia) => `📚 Examen de ${materia}`,
		cuerpo: (materia) => `¿Arrancamos una sesión de estudio para ${materia}?`,
	},
	{
		diasAntes: 1,
		titulo: (materia) => `📚 Examen de ${materia}`,
		cuerpo: (materia) => `¿Repasamos para ${materia}?`,
	},
	{
		diasAntes: 0,
		titulo: () => `🎯 Hoy es el día`,
		cuerpo: () => `¡A concentrarse y mantener la calma, vos podés!`,
	},
];

// Función principal que busca exámenes y manda las notificaciones
async function enviarNotificacionesExamenes() {
	console.log("[Cron] Revisando exámenes próximos...");

	try {
		// Traemos todos los usuarios que tienen push token guardado
		const usuarios = await User.find({ expoPushToken: { $exists: true, $ne: null } });

		if (usuarios.length === 0) {
			console.log("[Cron] No hay usuarios con push token registrado.");
			return;
		}

		const mensajes = [];
		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);

		for (const usuario of usuarios) {
			const token = usuario.expoPushToken;

			// Validamos que el token sea un Expo push token válido
			if (!Expo.isExpoPushToken(token)) {
				console.warn(`[Cron] Token inválido para usuario ${usuario._id}: ${token}`);
				continue;
			}

			// Traemos los exámenes futuros de este usuario
			const examenes = await Tarea.find({
				usuario_id: usuario._id.toString(),
				$or: [{ tipo: "examen" }, { tipo_examen: { $ne: null } }],
				fecha_vencimiento: { $gte: new Date() },
			});

			for (const examen of examenes) {
				const materia = examen.materia || "tu materia";
				const fechaExamen = new Date(examen.fecha_vencimiento);
				fechaExamen.setHours(0, 0, 0, 0);

				// Calculamos cuántos días faltan para el examen
				const diffMs = fechaExamen.getTime() - hoy.getTime();
				const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

				// Buscamos si hoy corresponde mandar algún recordatorio
				const recordatorio = RECORDATORIOS.find(
					(r) => r.diasAntes === diasRestantes
				);

				if (recordatorio) {
					mensajes.push({
						to: token,
						sound: "default",
						title: recordatorio.titulo(materia),
						body: recordatorio.cuerpo(materia),
						data: {
							tipo: "examen",
							materiaId: examen._id.toString(),
							materia,
						},
					});
				}
			}
		}

		if (mensajes.length === 0) {
			console.log("[Cron] No hay notificaciones para enviar hoy.");
			return;
		}

		// Expo recomienda mandar en chunks de hasta 100 mensajes
		const chunks = expo.chunkPushNotifications(mensajes);

		for (const chunk of chunks) {
			try {
				const tickets = await expo.sendPushNotificationsAsync(chunk);
				console.log(`[Cron] Enviados ${tickets.length} mensajes.`);
			} catch (error) {
				console.error("[Cron] Error enviando chunk:", error);
			}
		}

		console.log(`[Cron] Total notificaciones enviadas: ${mensajes.length}`);
	} catch (error) {
		console.error("[Cron] Error general:", error);
	}
}

// Inicia el cron: corre todos los días a las 9:00 AM (hora del servidor)
function iniciarCron() {
	cron.schedule("0 9 * * *", () => {
		enviarNotificacionesExamenes();
	});

	console.log("[Cron] Scheduler de notificaciones iniciado (9:00 AM diario).");
}

module.exports = { iniciarCron };