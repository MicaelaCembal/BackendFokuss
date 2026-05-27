require('dotenv').config();

const express = require('express');

const mongoose = require('mongoose');

const cors = require('cors');

const tareasRoutes = require("./routes/tareas");

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());

app.use(express.json());

app.use('/api/auth', authRoutes);

app.use("/api/tareas", tareasRoutes);

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI)

	.then(() => {

		console.log('Conexión exitosa a MongoDB Atlas');

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

app.listen(PORT, () => {

	console.log(`Servidor corriendo en puerto ${PORT}`);

});