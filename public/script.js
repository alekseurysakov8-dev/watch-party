const params = new URLSearchParams(window.location.search);
const roomId = params.get('room');
const videoUrl = params.get('video');

const socket = io();
let video = document.getElementById('video');

let isSyncing = false;

// ===== загрузка видео =====
if (videoUrl) {
  if (videoUrl.includes('youtu')) {
    const id = extractYouTubeId(videoUrl);
    video.outerHTML = `<iframe id="ytplayer" width="720" height="405"
      src="https://www.youtube.com/embed/${id}?enablejsapi=1"
      frameborder="0" allowfullscreen></iframe>`;
  } else {
    video.src = videoUrl;
  }
}

// ===== join room =====
if (roomId) {
  socket.emit('joinRoom', roomId);
}

// ===== отправка событий =====
video?.addEventListener('play', () => {
  if (isSyncing) return;
  socket.emit('videoEvent', { roomId, action: 'play', time: video.currentTime });
});

video?.addEventListener('pause', () => {
  if (isSyncing) return;
  socket.emit('videoEvent', { roomId, action: 'pause', time: video.currentTime });
});

video?.addEventListener('seeked', () => {
  if (isSyncing) return;
  socket.emit('videoEvent', { roomId, action: 'seek', time: video.currentTime });
});

// ===== получение событий =====
socket.on('videoEvent', data => {
  if (!video) return;

  isSyncing = true;

  if (data.action === 'play') video.play();
  if (data.action === 'pause') video.pause();
  if (data.action === 'seek') video.currentTime = data.time;

  setTimeout(() => (isSyncing = false), 300);
});

// ===== fullscreen =====
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const el = document.getElementById('video');
  if (el?.requestFullscreen) el.requestFullscreen();
});

// ===== helper =====
function extractYouTubeId(url) {
  const regExp = /(?:youtube\.com.*v=|youtu\.be\/)([^&]+)/;
  const match = url.match(regExp);
  return match ? match[1] : '';
}