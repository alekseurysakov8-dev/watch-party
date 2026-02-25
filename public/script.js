const params = new URLSearchParams(window.location.search);
const roomId = params.get('room');
const videoUrl = params.get('video');

const socket = io();
const video = document.getElementById('video');
const nickList = document.getElementById('nickList');

let isSyncing = false;
const myNick = "User" + Math.floor(Math.random() * 1000);

// ===== загрузка видео =====
if (videoUrl) {
  if (videoUrl.includes('youtu')) {
    video.outerHTML = `<iframe width="720" height="405" src="https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}" frameborder="0" allowfullscreen></iframe>`;
  } else {
    video.src = videoUrl;
  }
}

// ===== join room =====
socket.emit('joinRoom', { roomId, nick: myNick });

// ===== отправка событий (double control) =====
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
  isSyncing = true;

  if (data.action === 'play') video.play();
  if (data.action === 'pause') video.pause();
  if (data.action === 'seek') video.currentTime = data.time;

  setTimeout(() => (isSyncing = false), 300);
});

// ===== обновление ников =====
socket.on('nickList', list => {
  nickList.textContent = 'Connected: ' + list.join(', ');
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