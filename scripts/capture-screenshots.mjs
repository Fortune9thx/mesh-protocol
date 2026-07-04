/**
 * Captures the three Mesh Protocol UI screenshots for the README.
 * Requires: npm install -D puppeteer
 * Usage:    node scripts/capture-screenshots.mjs
 *
 * The frontend dev server must be running on http://localhost:3000
 */

import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: "ovr", label: "OVR" },
  { name: "con", label: "CON" },
  { name: "wrk", label: "WRK" },
];

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await page.goto(BASE, { waitUntil: "networkidle2" });
// give animations time to settle
await new Promise((r) => setTimeout(r, 1800));

for (const view of VIEWS) {
  if (view.label !== "OVR") {
    // click the nav button
    await page.evaluate((label) => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent.trim() === label
      );
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }, view.label);
    await new Promise((r) => setTimeout(r, 800));
  }

  const path = `${OUT}/${view.name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ ${path}`);
}

await browser.close();
console.log("\nDone. Add docs/screenshots/ to git and push.");
