import puppeteer from "puppeteer";
import { mkdirSync } from "fs";

const URL = process.argv[2] ?? "http://localhost:58855/design-mockup.html";
const OUT = "docs/mockups";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);

const names = { s1: "01-hero", s2: "02-thesis-tear", s3: "03-protocol-viz", s4: "04-human-intervention", s5: "05-agent-economy", s6: "06-cta-footer" };
for (const [id, name] of Object.entries(names)) {
  await page.evaluate((i) => document.getElementById(i).scrollIntoView(), id);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`captured ${name}`);
}
await browser.close();
