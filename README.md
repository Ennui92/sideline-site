# Sideline, project page

The public page for [Sideline](https://sideline-ermis.web.app), published at
**https://ennui92.github.io/sideline-site/**.

Sideline helps a marathon runner's friends organise race day: who stands where
on the course, what they bring, where the runner is right now, a shared chat and
a photo wall. The app's own code lives in a private repository; this repo is
only the page, so it can be served by GitHub Pages.

The waitlist form posts to the app's Cloudflare worker (`/waitlist`), which
saves the address to a write-only Firestore collection and DMs the owner.

## Promo reel

`promo/reel.html` is a 23 second vertical explainer (1080×1920) with a
voiceover, for Instagram stories and reels. Every frame is drawn by
`renderFrame(t)` on a canvas, so the page plays it (with the voice), scrubs it,
and can record it in the browser.

The voiceover script and timings live in `promo/voiceover.json`.
`python promo/voiceover.py <kokoro.onnx> <voices.bin>` speaks it with Kokoro, a
local open text to speech model (voice `af_heart`), into `promo/voiceover.wav`.

`node promo/stills.mjs` renders the screens the site shows under "A look
inside" (and the video's poster) from the same drawings, into
`assets/screens/`. `voiceover.py` also writes the player's captions,
`promo/sideline-reel.vtt`.

`node promo/render.mjs` steps through the reel frame by frame and writes
`promo/sideline-reel.mp4` (H.264, 30 fps, voice levelled to -14 LUFS). It needs
Playwright and an ffmpeg with libx264 (`FFMPEG=/path/to/ffmpeg` if it is not on
the PATH).
