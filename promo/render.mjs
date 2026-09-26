// Renders reel.html frame by frame into an MP4 for Instagram.
//
//   node promo/render.mjs [out.mp4]
//
// Mixes in promo/voiceover.wav when it exists (see voiceover.py).
// Needs Playwright (with a Chromium) and ffmpeg with libx264. Set FFMPEG to
// point at a specific ffmpeg binary if it is not on the PATH.
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] ?? path.join(here, "sideline-reel.mp4"));
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";

let pw;
try {
  pw = await import("playwright");
} catch {
  const root = execSync("npm root -g").toString().trim();
  pw = await import(pathToFileURL(path.join(root, "playwright", "index.mjs")).href);
}

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(here, "reel.html")).href + "?render");
await page.evaluate(() => window.ready);
const { FPS, DUR } = await page.evaluate(() => window.REEL);
const frames = Math.round(FPS * DUR);

// The voiceover from voiceover.py, levelled to the loudness Instagram plays at
// (-14 LUFS). Without one the video gets a silent track, because some players
// and upload paths treat a video with no audio stream oddly.
const voice = path.join(here, "voiceover.wav");
const hasVoice = existsSync(voice);
const audioIn = hasVoice ? ["-i", voice] : ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"];
const audioFx = hasVoice ? ["-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100,apad"] : [];
if (hasVoice) {
  // The page plays this copy alongside the animation.
  execSync(`"${ffmpeg}" -y -loglevel error -i "${voice}" -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 44100 -c:a aac -b:a 128k "${path.join(here, "voiceover.m4a")}"`);
}
const ff = spawn(ffmpeg, [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  ...audioIn,
  "-map", "0:v", "-map", "1:a", ...audioFx, "-t", String(DUR),
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
  "-profile:v", "high", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "128k", "-ac", "2",
  "-movflags", "+faststart", out,
], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error("ffmpeg exited " + c)) : res())));

for (let i = 0; i < frames; i++) {
  const b64 = await page.evaluate((t) => {
    window.renderFrame(t);
    return document.getElementById("reel").toDataURL("image/png").slice(22);
  }, i / FPS);
  if (!ff.stdin.write(Buffer.from(b64, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % FPS === 0) process.stdout.write(`\r${Math.round((i / frames) * 100)}%`);
}
ff.stdin.end();
await done;
await browser.close();
console.log(`\rWrote ${out} (${frames} frames, ${FPS} fps)`);
