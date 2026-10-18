// Runs in the page's own JS world (manifest "world": "MAIN") so it can call YouTube's player API,
// which isn't visible to isolated content scripts. content.js talks to it via a DOM CustomEvent.
document.addEventListener('cvm-set-volume', (e) => {
  try {
    const { volume, muted } = JSON.parse(e.detail);
    const player = document.getElementById('movie_player');
    if (!player || !player.setVolume) return;
    player.setVolume(Math.round(volume * 100));
    if (muted) player.mute(); else player.unMute();
  } catch (_) {}
});
