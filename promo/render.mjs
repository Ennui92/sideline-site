// Renders reel.html frame by frame into an MP4 for Instagram.
//
//   node promo/render.mjs [out.mp4]
//
// Needs Playwright (with a Chromium) and ffmpeg with libx264. Set FFMPEG to
// point at a specific ffmpeg binary if it is not on the PATH.
import { spawn, execSync } from "node:child_process";
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

// A silent stereo track: some players and upload paths treat a video with no
// audio stream oddly. Instagram lets you add music on top.
const ff = spawn(ffmpeg, [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
  "-map", "0:v", "-map", "1:a", "-shortest",
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
  "-profile:v", "high", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "128k",
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
