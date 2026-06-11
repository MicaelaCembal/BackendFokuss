require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const tareasRoutes = require("./routes/tareas");
const authRoutes = require('./routes/auth');
const flashcardsRoutes = require("./routes/flashcards");
const pomodoroRoutes = require("./routes/pomodoro");
const amigosRoutes = require("./routes/amigos");
const rachasCompartidasRoutes = require("./routes/rachasCompartidas");
const recompensasRoutes = require("./routes/recompensas");
const musicaRoutes = require("./routes/musica");
const materiasRoutes = require('./routes/materias');
const { iniciarCron } = require("./jobs/notificacionesCron");
const mapasMentalesRoutes = require('./routes/mapasMentales');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
	console.log("CONTENT TYPE:");
	console.log(req.headers["content-type"]);
	next();
});

app.use('/api/auth', authRoutes);
app.use("/api/tareas", tareasRoutes);
app.use("/api/flashcards", flashcardsRoutes);
app.use("/api/pomodoro", pomodoroRoutes);
app.use("/api/recompensas", recompensasRoutes);
app.use("/api/amigos", amigosRoutes);
app.use("/api/rachas-compartidas", rachasCompartidasRoutes);
app.use("/api/musica", musicaRoutes);
app.use('/api/materias', materiasRoutes);
app.use('/api/mapas-mentales', mapasMentalesRoutes);
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)
	.then(() => {
		console.log('Conexión exitosa a MongoDB Atlas');

		iniciarCron();
	})
	.catch((err) => {
		console.log(err);
	});

app.get('/api/status', (req, res) => {
	res.json({
		mensaje: 'Backend funcionando',
	});
});



const PORT = process.env.PORT || 3000;


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});