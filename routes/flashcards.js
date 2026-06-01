const express = require("express");

const router = express.Router();

const Flashcard = require("../models/Flashcard");

router.post("/", async (req, res) => {

    try {

        const flashcard = new Flashcard(req.body);

        await flashcard.save();

        res.status(201).json(flashcard);

    } catch (error) {

        res.status(500).json(error);

    }

});

router.get("/:usuarioId", async (req, res) => {

    try {

        const flashcards = await Flashcard.find({
            usuario_id: req.params.usuarioId
        });

        res.json(flashcards);

    } catch (error) {

        res.status(500).json(error);

    }

});

router.delete("/:id", async (req, res) => {

    try {

        await Flashcard.findByIdAndDelete(
            req.params.id
        );

        res.json({
            mensaje: "Flashcard eliminada"
        });

    } catch (error) {

        res.status(500).json(error);

    }

});

module.exports = router;