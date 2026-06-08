const express = require('express');
const router = express.Router();
const axios = require('axios');

const CLIENT_ID = '4d39d16c'; 

router.get('/dashboard', async (req, res) => {
  try {
    const jamendoUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=20&tags=lofi,chill&include=musicinfo`;
    
    const respuesta = await axios.get(jamendoUrl);
    const pistas = respuesta.data.results;

    const dashboardData = {
      destacados: pistas.slice(0, 5).map(track => ({
        id: track.id,
        titulo: track.name,
        imagen: track.image, 
        audio_url: track.audio 
      })),
      recientes: pistas.slice(5, 10).map(track => ({
        id: track.id,
        titulo: track.name.split(' ')[0],
        imagen: track.image,
        audio_url: track.audio
      })),
      paraVos: pistas.slice(10, 15).map(track => ({
        id: track.id,
        titulo: track.name,
        artista: track.artist_name,
        imagen: track.image,
        audio_url: track.audio
      }))
    };

    res.json(dashboardData);

  } catch (error) {
    console.error("Error al conectar con Jamendo:", error.message);
    res.status(500).json({ error: "No se pudo obtener la música" });
  }
});

module.exports = router;