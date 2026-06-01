const mongoose = require("mongoose");

const FlashcardSchema = new mongoose.Schema({

    usuario_id: String,

    materia: String,

    pregunta: String,

    respuesta: String,

    fecha_creacion: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model(
    "Flashcard",
    FlashcardSchema
);