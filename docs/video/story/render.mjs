// Render story.html frame-by-frame to H.264 via ffmpeg.
// usage: node render.mjs <startFrame> <endFrame> <out.mp4>   (needs: npm i three playwright; ffmpeg with libx264 or FF=/path)
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path';
const [, , startF, endF, out] = process.argv;
const FPS = 30, FF = process.env.FF || 'ffmpeg';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('PAGEERR', e.message));
// serve three.js from node_modules instead of the CDN in the import map
await p.route('https://cdn.jsdelivr.net/npm/three@*/build/**', r => {
  const f = path.join(process.cwd(), 'node_modules/three/build', path.basename(new URL(r.request().url()).pathname));
  r.fulfill({ body: fs.readFileSync(f), contentType: 'text/javascript' });
});
await p.addInitScript(() => { window.__RENDER = true; });
await p.goto('file://' + process.cwd() + '/story.html');
await p.waitForFunction(() => window.__ready);
await p.evaluate(() => window.__ready);
const ff = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = +startF; f < +endF; f++) {
  await p.evaluate(t => window.render(t), f / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 100 === 0) console.log(out, 'frame', f);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await b.close();
