// Threshold the logo JPG → transparent-bg white + black PNGs, and sample
// dark-pixel positions → JSON for the hero particle boot.
import puppeteer from "puppeteer";
import { writeFileSync } from "fs";

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.goto("file:///C:/Users/HP/Desktop/mesh-protocol/frontend/public/brand/mesh-logo.jpg");

const result = await page.evaluate(async () => {
  const img = document.querySelector("img");
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, w, h);

  // white-on-transparent version
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < src.data.length; i += 4) {
    const lum = (src.data[i] + src.data[i + 1] + src.data[i + 2]) / 3;
    const dark = lum < 128;
    out.data[i] = 250; out.data[i + 1] = 250; out.data[i + 2] = 247;
    out.data[i + 3] = dark ? 255 : 0;
  }
  ctx.putImageData(out, 0, 0);
  const whitePng = c.toDataURL("image/png");

  // particle sample grid (normalized -1..1, aspect-corrected)
  const step = Math.max(2, Math.floor(w / 110));
  const pts = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const lum = (src.data[i] + src.data[i + 1] + src.data[i + 2]) / 3;
      if (lum < 128) pts.push([+((x / w) * 2 - 1).toFixed(4), +(-((y / h) * 2 - 1)).toFixed(4)]);
    }
  }
  return { whitePng, pts, count: pts.length };
});

writeFileSync("frontend/public/brand/mesh-logo-white.png",
  Buffer.from(result.whitePng.split(",")[1], "base64"));
writeFileSync("frontend/public/brand/logo-points.json", JSON.stringify(result.pts));
console.log("particle points:", result.count);
await browser.close();
