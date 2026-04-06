const fs = require('fs').promises;

// Leemos las variables que configuraremos en GitHub
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const MAX_VIDEOS = process.env.MAX_VIDEOS || 3;

async function getVideos() {
  // 1. Buscamos los videos como ya lo hacíamos
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=25&type=video`;
  
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.items || searchData.items.length === 0) return '';

  // Sacamos los IDs de los videos para pedir su duración
  const videoIds = searchData.items.map(v => v.id.videoId).join(',');

  // 2. Pedimos los detalles (duración) de esos videos específicos
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=contentDetails`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  // 3. Filtramos: Si dura menos de un minuto (estilo Shorts), lo quitamos
  // La duración viene en formato ISO 8601 (ej: PT1M30S)
  const longVideos = detailsData.items.filter(video => {
    const duration = video.contentDetails.duration;
    // Si no tiene "M" (minutos) o "H" (horas), es que dura puras "S" (segundos)
    // Los Shorts suelen ser < 60s, así que si no tiene "M" ni "H", lo tiramos.
    return duration.includes('M') || duration.includes('H');
  });

  // Solo nos quedamos con los que tú quieras (MAX_VIDEOS)
  const finalVideos = longVideos.slice(0, MAX_VIDEOS);

  return finalVideos.map(video => {
    const id = video.id;
    // Buscamos el snippet original para el título
    const originalSnippet = searchData.items.find(v => v.id.videoId === id).snippet;
    const title = originalSnippet.title.replace(/'/g, "\\'");
    
    return `<a href="https://youtu.be/${id}" target="_blank"><img width="31%" src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="${title}" /></a>`;
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