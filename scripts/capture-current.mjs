import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3001";
mkdirSync("docs/screenshots", { recursive: true });

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const shots = [
  ["command", "/console"],
  ["network", "/network"],
  ["chamber", "/chamber"],
];
for (const [name, path] of shots) {
  await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: `docs/screenshots/${name}.png` });
  console.log(`captured ${name}`);
}
await browser.close();
