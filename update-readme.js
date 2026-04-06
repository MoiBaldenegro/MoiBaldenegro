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
  // 1. Buscamos los últimos videos
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=25&type=video`;
  
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.items || searchData.items.length === 0) return '';

  const videoIds = searchData.items.map(v => v.id.videoId).join(',');

  // 2. Pedimos los detalles para filtrar por duración
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=snippet,contentDetails`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  // 3. Filtro para dejar solo videos largos (> 60s)
  const longVideos = detailsData.items.filter(video => {
    const totalSeconds = parseISO8601Duration(video.contentDetails.duration);
    return totalSeconds > 60; 
  });

  // 4. Generamos el HTML con imagen + título clickeable
  // Usamos un div con display inline-block para que se acomoden de a 3 (31% de ancho)
  return longVideos.slice(0, MAX_VIDEOS).map(video => {
    const id = video.id;
    const title = video.snippet.title.replace(/"/g, '&quot;');
    const thumbUrl = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    const videoUrl = `https://youtu.be/${id}`;
    
    return `
<div style="display: inline-block; vertical-align: top; margin-right: 1%; margin-bottom: 20px;">
  <a href="${videoUrl}" target="_blank">
    <img src="${thumbUrl}" alt="${title}" style="border-radius: 10px;" />
    <br />
    <strong style="font-size: 12px;">${title}</strong>
  </a>
</div>`;
  }).join('');
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