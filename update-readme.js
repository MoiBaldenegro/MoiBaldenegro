const fs = require('fs').promises;

// Leemos las variables que configuraremos en GitHub
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const MAX_VIDEOS = process.env.MAX_VIDEOS || 3;

async function getVideos() {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=${MAX_VIDEOS}&type=video`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.items) {
    console.error('Error de API o sin videos:', data);
    return '';
  }

  return data.items.map(video => {
    const title = video.snippet.title.replace(/'/g, "\\'");
    const id = video.id.videoId;
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