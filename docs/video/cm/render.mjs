// Render cm.html frame-by-frame to H.264 via ffmpeg. Serve this folder over HTTP first (module imports):
//   npx http-server -p 8123 .      then: node render.mjs <startFrame> <endFrame> <out.mp4>
import { chromium } from 'playwright';
import { spawn } from 'child_process';
const [, , startF, endF, out] = process.argv;
const FPS = 30, FF = process.env.FF || 'ffmpeg', URL = process.env.URL || 'http://127.0.0.1:8123/cm.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.addInitScript(() => { window.__RENDER = true; });
await p.goto(URL); await p.waitForFunction(() => window.render); await p.evaluate(() => window.__ready);
const ff = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = +startF; f < +endF; f++) {
  await p.evaluate(t => window.render(t), f / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 100 === 0) console.log(out, 'frame', f);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
