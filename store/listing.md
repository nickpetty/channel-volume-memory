# Chrome Web Store listing

**Name:** Channel Volume Memory
**Category:** Productivity (or Entertainment)
**Summary (<=132 chars):** Remembers the player volume for each Twitch, YouTube and Kick channel. No popup, no setup.

**Description:**
Tired of resetting your volume every time you switch Twitch, YouTube or Kick channels? Channel Volume Memory
remembers the volume (and mute state) you set for each channel and restores it automatically when you return.

- Just use the site's own volume slider. There's nothing else to open or configure.
- Per-channel volume, saved instantly.
- Everything stays on your device. No accounts, no tracking.

**Permission justification:**
- `storage`: saves each channel's volume locally.
- Host access to `https://www.twitch.tv/*`, `https://www.youtube.com/*` and `https://kick.com/*`: needed to read and set the player volume and identify the channel.

**Single purpose:** Remember and restore the video player volume per channel on Twitch, YouTube and Kick.
**Data usage:** No user data collected; no data leaves the device.

**Screenshots:** `store/screenshots/screenshot-1.png` to `screenshot-3.png` (1280x800, 24-bit PNG).
Source HTML is in `store/src/`; re-render with headless Chrome:
`chrome --headless=new --window-size=1280,800 --screenshot=out.png file:///.../store/src/1.html`
