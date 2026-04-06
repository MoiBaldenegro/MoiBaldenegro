const fs = require('fs').promises;

// Leemos las variables que configuraremos en GitHub
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const MAX_VIDEOS = process.env.MAX_VIDEOS || 3;

// Función auxiliar para convertir el formato raro de YouTube (PT1M15S) a segundos
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

async function getVideos() {
  // 1. Jalamos los últimos movimientos del canal
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=25&type=video`;
  
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.items || searchData.items.length === 0) return '';

  const videoIds = searchData.items.map(v => v.id.videoId).join(',');

  // 2. Pedimos los detalles para saber cuánto duran
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=snippet,contentDetails`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  // 3. FILTRO: Solo dejamos pasar videos de MÁS de un minuto (adiós Shorts)
  const longVideos = detailsData.items.filter(video => {
    const totalSeconds = parseISO8601Duration(video.contentDetails.duration);
    return totalSeconds > 125; 
  });

  // 4. Armamos el HTML para el README
  return longVideos.slice(0, MAX_VIDEOS).map(video => {
    const id = video.id;
    // Escapamos comillas del título para que no rompan el HTML del alt
    const title = video.snippet.title.replace(/"/g, '&quot;');
    
    return `<a href="https://youtu.be/${id}" target="_blank"><img width="31%" src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="${title}" />Ver en YouTube</a>`;
  }).join(' ');
}

async function main() {
  try {
    const videosHtml = await getVideos();
    const readme = await fs.readFile('README.md', 'utf-8');

    // 1. Definimos qué texto buscar (las marcas que pusiste en el README)
    // Usamos las etiquetas como "anclas" para que el script sepa dónde entrar y salir
   const regex = /## Latest videos[\s\S]*## Connect/;

const newReadme = readme.replace(
  regex,
  `## Latest videos\n\n${videosHtml}\n\n## Connect`
);

    ;

    await fs.writeFile('README.md', newReadme);
    console.log('✅ README actualizado: Los videos ya están en su lugar');
  } catch (err) {
    console.error('❌ Error al actualizar:', err);
  }
}

main();