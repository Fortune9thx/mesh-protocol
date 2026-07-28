// Procedurally synthesize Mesh UI sounds → WAV (44.1kHz 16-bit mono).
// boot-hum: filtered sine swell · paper-tear: shaped noise burst · settle-tick: sine ping
import { writeFileSync } from "fs";

const SR = 44100;

function wav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, 44 + i * 2);
  return buf;
}

// ── boot hum: 2.2s low sine swell w/ slow vibrato + soft partial ──
{
  const dur = 2.2, n = SR * dur, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, p = t / dur;
    const env = Math.pow(Math.sin(Math.PI * p), 1.6) * 0.55;
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 1.3 * t);
    out[i] = env * (0.8 * Math.sin(2 * Math.PI * 55 * vib * t)
                  + 0.25 * Math.sin(2 * Math.PI * 110 * vib * t)
                  + 0.08 * Math.sin(2 * Math.PI * 220 * t));
  }
  writeFileSync("frontend/public/sound/boot-hum.wav", wav(out));
}

// ── paper tear: 0.5s noise burst, band-shaped, ripping envelope ──
{
  const dur = 0.5, n = SR * dur, out = new Float32Array(n);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, p = t / dur;
    // crackle density rises then dies; high-passed noise
    const gate = Math.random() < 0.55 + 0.4 * Math.sin(Math.PI * p) ? 1 : 0.25;
    const noise = (Math.random() * 2 - 1) * gate;
    lp += 0.35 * (noise - lp);            // low-pass
    const hp = noise - lp;                 // high-pass component (fiber crackle)
    lp2 += 0.08 * (noise - lp2);           // body
    const env = Math.pow(1 - p, 1.4) * (p < 0.06 ? p / 0.06 : 1) * 0.7;
    out[i] = env * (0.75 * hp + 0.35 * lp2);
  }
  writeFileSync("frontend/public/sound/paper-tear.wav", wav(out));
}

// ── settlement tick: 140ms sine ping (E6) with fast decay + click transient ──
{
  const dur = 0.14, n = SR * dur, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 42) * 0.5;
    const click = i < 40 ? (1 - i / 40) * 0.2 : 0;
    out[i] = env * Math.sin(2 * Math.PI * 1318.5 * t) + click * (Math.random() * 2 - 1);
  }
  writeFileSync("frontend/public/sound/settle-tick.wav", wav(out));
}

console.log("synthesized: boot-hum.wav, paper-tear.wav, settle-tick.wav");
