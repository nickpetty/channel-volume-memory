// Channel Volume Memory: records the native player volume per channel and restores it.
// Supports Twitch and YouTube via small per-site adapters.
const KEY = 'channelVolumes';
const SETTLE_MS = 1500; // ignore volume events while the site / we are still applying state
const NAV_GRACE_MS = 1000; // YouTube: wait for the channel name to update after navigation

const TWITCH_RESERVED = new Set([
  'directory', 'videos', 'video', 'popout', 'settings', 'subscriptions', 'inventory',
  'wallet', 'drops', 'friends', 'downloads', 'turbo', 'prime', 'search', 'u', 'moderator',
]);

const KICK_RESERVED = new Set([
  'browse', 'category', 'categories', 'events', 'video', 'videos', 'clips', 'clip', 'dashboard',
  'following', 'search', 'settings', 'popout', 'community-guidelines', 'terms-of-service',
  'privacy-policy', 'dmca-policy', 'support', 'creator-dashboard', 'subscriptions', 'wallet',
]);

const adapters = {
  'www.twitch.tv': {
    id: 'twitch',
    getChannel() {
      const seg = location.pathname.split('/').filter(Boolean)[0];
      return seg && !TWITCH_RESERVED.has(seg.toLowerCase()) ? seg.toLowerCase() : null;
    },
    // Drive the native slider so Twitch's UI and player state stay in sync.
    setVolume(video, { volume, muted }) {
      const slider = document.querySelector('input[data-a-target="player-volume-slider"]');
      if (slider) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(slider, String(volume));
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
      video.volume = volume;
      video.muted = muted;
    },
  },
  'kick.com': {
    id: 'kick',
    getChannel() {
      const seg = location.pathname.split('/').filter(Boolean)[0];
      return seg && !KICK_RESERVED.has(seg.toLowerCase()) ? seg.toLowerCase() : null;
    },
    // Kick's slider is a custom control that can't be driven reliably from a content script, so set the
    // video directly. The on-screen slider catches up the next time the user touches it.
    setVolume(video, { volume, muted }) {
      video.volume = volume;
      video.muted = muted;
    },
  },
  'www.youtube.com': {
    id: 'youtube',
    lastHref: location.href,
    navAt: 0,
    getChannel() {
      if (location.href !== this.lastHref) {
        this.lastHref = location.href;
        this.navAt = Date.now();
      }
      if (location.pathname !== '/watch') return null;
      if (Date.now() - this.navAt < NAV_GRACE_MS) return null; // channel link may still be stale
      const link = document.querySelector(
        'ytd-watch-metadata ytd-video-owner-renderer ytd-channel-name a[href]');
      const href = link && link.getAttribute('href');
      const m = href && href.match(/^\/(@[^/?#]+|channel\/[^/?#]+|c\/[^/?#]+|user\/[^/?#]+)/);
      return m ? decodeURIComponent(m[1]).toLowerCase() : null;
    },
    // YouTube resets volume to its own player state, so go through its player API (see youtube-bridge.js).
    setVolume(video, { volume, muted }) {
      document.dispatchEvent(new CustomEvent('cvm-set-volume', {
        detail: JSON.stringify({ volume, muted }),
      }));
    },
  },
};

const site = adapters[location.hostname];
if (site) run(site);

function run(site) {
  let channel = null; // namespaced key, e.g. "twitch:shroud"
  let ignoreUntil = 0;
  let touchedAt = 0; // last time the user changed the volume
  let saved = {};

  function load() {
    return chrome.storage.local.get(KEY)
      .then((r) => {
        saved = r[KEY] || {};
        // Migrate v1 keys (plain Twitch channel names) to namespaced keys.
        let migrated = false;
        for (const k of Object.keys(saved)) {
          if (!k.includes(':')) {
            saved[`twitch:${k}`] = saved[k];
            delete saved[k];
            migrated = true;
          }
        }
        if (migrated) chrome.storage.local.set({ [KEY]: saved }).catch(() => {});
      })
      .catch(() => {});
  }

  function store(key, volume, muted) {
    saved[key] = { volume, muted };
    // The extension context is invalidated if the extension updates while a tab is open.
    try {
      chrome.storage.local.set({ [KEY]: saved }).catch(() => {});
    } catch (_) {}
  }

  function applyWhenReady(key) {
    const entry = saved[key];
    ignoreUntil = Date.now() + SETTLE_MS;
    if (!entry) return;
    // Apply, then keep verifying for a few seconds: the site may reset its own volume as the
    // player finishes loading. Stop early if the user changes the volume themselves.
    const startedAt = Date.now();
    touchedAt = 0;
    let tries = 0;
    let stable = 0;
    const t = setInterval(() => {
      if (channel !== key || ++tries > 40 || touchedAt > startedAt) return clearInterval(t);
      const video = document.querySelector('video');
      if (!video) return;
      const ok = Math.abs(video.volume - entry.volume) < 0.01 && video.muted === !!entry.muted;
      if (ok) {
        if (++stable >= 4) clearInterval(t);
        return;
      }
      stable = 0;
      ignoreUntil = Date.now() + SETTLE_MS;
      site.setVolume(video, entry);
    }, 500);
  }

  // volumechange doesn't bubble, so listen in the capture phase.
  document.addEventListener('volumechange', (e) => {
    if (!(e.target instanceof HTMLVideoElement)) return;
    if (!channel || Date.now() < ignoreUntil) return;
    touchedAt = Date.now();
    store(channel, e.target.volume, e.target.muted);
  }, true);

  // Both sites are SPAs, so poll for channel changes. Start once saved volumes are loaded.
  load().then(() => {
    setInterval(() => {
      const ch = site.getChannel();
      const key = ch ? `${site.id}:${ch}` : null;
      if (key === channel) return;
      channel = key;
      if (key) applyWhenReady(key);
    }, 500);
  });
}
