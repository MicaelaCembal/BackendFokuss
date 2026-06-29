const express = require('express');
const router = express.Router();
const axios = require('axios');

const CLIENT_ID = '4d39d16c';
const BASE = 'https://api.jamendo.com/v3.0';

function mapTrack(track) {
  return {
    id: String(track.id),
    titulo: track.name,
    artista: track.artist_name,
    album: track.album_name || null,
    imagen: track.image,
    audio_url: track.audio,
  };
}

async function fetchTracks(tags, limit = 10, order = 'popularity_total') {
  const url = `${BASE}/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&tags=${tags}&include=musicinfo&order=${order}`;
  const res = await axios.get(url);
  return (res.data.results || []).map(mapTrack);
}

router.get('/dashboard', async (req, res) => {
  try {
    const [lofi, ambient, piano, acoustic, jazz, classical, nature, focus] = await Promise.all([
      fetchTracks('lofi', 10),
      fetchTracks('ambient', 10),
      fetchTracks('piano', 10),
      fetchTracks('acoustic+chill', 10),
      fetchTracks('jazz', 10),
      fetchTracks('classical', 10),
      fetchTracks('nature', 10),
      fetchTracks('focus+study', 10),
    ]);

    res.json({
      destacados: lofi.slice(0, 5),
      ambient,
      piano,
      acoustic,
      jazz,
      classical,
      nature,
      focus,
    });
  } catch (error) {
    console.error('Error al conectar con Jamendo:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la música' });
  }
});

router.get('/buscar', async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);
  try {
    const url = `${BASE}/tracks/?client_id=${CLIENT_ID}&format=json&limit=50&search=${encodeURIComponent(q.trim())}&include=musicinfo&order=popularity_total`;
    const response = await axios.get(url);
    const termino = q.trim().toLowerCase();
    const filtrados = (response.data.results || [])
      .filter(t =>
        t.name?.toLowerCase().includes(termino) ||
        t.artist_name?.toLowerCase().includes(termino)
      )
      .slice(0, 20)
      .map(mapTrack);
    res.json(filtrados);
  } catch (error) {
    console.error('Error buscando en Jamendo:', error.message);
    res.status(500).json({ error: 'No se pudo buscar' });
  }
});

module.exports = router;
