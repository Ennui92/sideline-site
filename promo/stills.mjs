// Renders the website's screens from reel.html: a few of its cards at the
// moment they are complete, cropped, plus a poster frame for the video.
//
//   node promo/stills.mjs
//
// Writes WebP files into assets/screens/. Needs Playwright with a Chromium.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "..", "assets", "screens");
mkdirSync(outDir, { recursive: true });

let pw;
try {
  pw = await import("playwright");
} catch {
  const root = execSync("npm root -g").toString().trim();
  pw = await import(pathToFileURL(path.join(root, "playwright", "index.mjs")).href);
}

// t is a time in the reel where the card is finished and not yet leaving;
// crop is [x, y, w, h] in the reel's 1080x1920 frame.
const SHOTS = [
  { name: "coverage", t: 11.45, crop: [56, 580, 968, 928] },
  { name: "plan", t: 13.6, crop: [56, 582, 968, 936] },
  { name: "live", t: 16.8, crop: [56, 500, 968, 1030] },
  { name: "together", t: 19.45, crop: [36, 584, 1008, 906] },
];

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(here, "reel.html")).href + "?render");
await page.evaluate(() => window.ready);

for (const s of SHOTS) {
  const b64 = await page.evaluate(({ t, crop }) => {
    window.renderStill(t);
    const [x, y, w, h] = crop;
    const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
    c.getContext("2d").drawImage(document.getElementById("reel"), x, y, w, h, 0, 0, w, h);
    return c.toDataURL("image/webp", 0.9).split(",")[1];
  }, s);
  writeFileSync(path.join(outDir, `${s.name}.webp`), Buffer.from(b64, "base64"));
  console.log(`${s.name}.webp`);
}

// The poster: the opening line, sticker and all, at half size.
const poster = await page.evaluate(() => {
  window.renderFrame(2.3);
  const c = Object.assign(document.createElement("canvas"), { width: 540, height: 960 });
  c.getContext("2d").drawImage(document.getElementById("reel"), 0, 0, 540, 960);
  return c.toDataURL("image/webp", 0.88).split(",")[1];
});
writeFileSync(path.join(outDir, "poster.webp"), Buffer.from(poster, "base64"));
console.log("poster.webp");

await browser.close();
