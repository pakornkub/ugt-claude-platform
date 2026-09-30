// JP-cartoon (chibi) mascots drawn in SVG. Each builder returns an SVG <g> string in a 400×600 box.
// dev({expr, pose, t}) · mate({expr, pose, t}) · ugt({expr, pose, t})
// expr: happy | joy | shock | confused | wink | focus     pose: down | wave | clutch | cheer | thumb | type | point

const OL = '#2a2440';          // outline
const SW = 5;                  // outline width
let uid = 0;

export const DEFS = `
<linearGradient id="iris-indigo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset=".55" stop-color="#4338ca"/><stop offset="1" stop-color="#a5b4fc"/></linearGradient>
<linearGradient id="iris-brown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1f0e"/><stop offset=".55" stop-color="#8a4b1f"/><stop offset="1" stop-color="#e2a86b"/></linearGradient>
<linearGradient id="iris-teal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#042f2e"/><stop offset=".55" stop-color="#0f766e"/><stop offset="1" stop-color="#5eead4"/></linearGradient>
<radialGradient id="blush" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fb7185" stop-opacity=".75"/><stop offset="1" stop-color="#fb7185" stop-opacity="0"/></radialGradient>
<linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3cf"/><stop offset="1" stop-color="#f7cdb0"/></linearGradient>
<linearGradient id="box-front" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef1fb"/></linearGradient>
`;

// ---------- eyes ----------
function eye(cx, cy, s, kind, iris, flip = 1) {
  const g = [];
  if (kind === 'closed') {         // ^  happy closed
    g.push(`<path d="M${cx - 24 * s} ${cy + 6 * s} Q${cx} ${cy - 22 * s} ${cx + 24 * s} ${cy + 6 * s}" fill="none" stroke="${OL}" stroke-width="${7 * s}" stroke-linecap="round"/>`);
    return g.join('');
  }
  if (kind === 'line') {           // — focused / squint
    g.push(`<path d="M${cx - 22 * s} ${cy} Q${cx} ${cy - 5 * s} ${cx + 22 * s} ${cy}" fill="none" stroke="${OL}" stroke-width="${7 * s}" stroke-linecap="round"/>`);
    return g.join('');
  }
  if (kind === 'swirl') {
    g.push(`<ellipse cx="${cx}" cy="${cy}" rx="${25 * s}" ry="${30 * s}" fill="#fff" stroke="${OL}" stroke-width="${4 * s}"/>`);
    g.push(`<path d="M${cx} ${cy} m${-2 * s} 0 a${3 * s} ${3 * s} 0 1 1 ${6 * s} 0 a${7 * s} ${7 * s} 0 1 1 ${-13 * s} 0 a${11 * s} ${11 * s} 0 1 1 ${21 * s} 0 a${15 * s} ${15 * s} 0 1 1 ${-29 * s} 0" fill="none" stroke="${OL}" stroke-width="${3.5 * s}"/>`);
    return g.join('');
  }
  if (kind === 'shock') {
    g.push(`<ellipse cx="${cx}" cy="${cy}" rx="${27 * s}" ry="${33 * s}" fill="#fff" stroke="${OL}" stroke-width="${4.5 * s}"/>`);
    g.push(`<circle cx="${cx}" cy="${cy + 2 * s}" r="${6 * s}" fill="${OL}"/>`);
    return g.join('');
  }
  // open, sparkly anime eye
  const rx = 25 * s, ry = 32 * s;
  g.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/>`);
  g.push(`<ellipse cx="${cx + 1 * s * flip}" cy="${cy + 4 * s}" rx="${20 * s}" ry="${27 * s}" fill="url(#${iris})"/>`);
  g.push(`<ellipse cx="${cx + 1 * s * flip}" cy="${cy + 6 * s}" rx="${9 * s}" ry="${13 * s}" fill="#120f2e"/>`);
  g.push(`<path d="M${cx - 14 * s} ${cy + 20 * s} Q${cx} ${cy + 28 * s} ${cx + 14 * s} ${cy + 20 * s}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="${3 * s}" stroke-linecap="round"/>`);
  g.push(`<ellipse cx="${cx - 8 * s * flip}" cy="${cy - 9 * s}" rx="${7.5 * s}" ry="${9 * s}" fill="#fff"/>`);
  g.push(`<circle cx="${cx + 8 * s * flip}" cy="${cy + 11 * s}" r="${3.8 * s}" fill="#fff"/>`);
  g.push(`<circle cx="${cx - 12 * s * flip}" cy="${cy + 8 * s}" r="${2 * s}" fill="#fff" opacity=".8"/>`);
  // upper lash line with outer flick
  const ox = cx + (rx + 7 * s) * flip;
  g.push(`<path d="M${cx - (rx + 2 * s) * flip} ${cy - 4 * s} Q${cx - rx * .6 * flip} ${cy - ry - 6 * s} ${cx + 4 * s * flip} ${cy - ry - 4 * s} Q${cx + rx * .8 * flip} ${cy - ry + 2 * s} ${ox} ${cy - 16 * s}" fill="none" stroke="${OL}" stroke-width="${8 * s}" stroke-linecap="round" stroke-linejoin="round"/>`);
  g.push(`<path d="M${cx - 10 * s} ${cy + ry + 3 * s} L${cx + 6 * s} ${cy + ry + 4 * s}" stroke="${OL}" stroke-width="${3 * s}" stroke-linecap="round" opacity=".7"/>`);
  return g.join('');
}

function faceBits(expr, cx, cy, iris, eyeY = 0) {
  const L = [], ex = 52, ey = cy + eyeY;
  const kinds = { happy: ['open', 'open'], joy: ['closed', 'closed'], shock: ['shock', 'shock'], confused: ['swirl', 'swirl'], wink: ['open', 'closed'], focus: ['line', 'line'] }[expr] || ['open', 'open'];
  L.push(eye(cx - ex, ey, 1, kinds[0], iris, -1));
  L.push(eye(cx + ex, ey, 1, kinds[1], iris, 1));
  // brows
  const brow = { happy: [-6, 0], joy: [-8, 0], shock: [-22, -.18], confused: [-14, .2], wink: [-8, 0], focus: [-10, .22] }[expr] || [-6, 0];
  [-1, 1].forEach(sd => {
    const bx = cx + sd * ex, by = ey - 46 + brow[0];
    const tilt = brow[1] * sd * 30;
    L.push(`<path d="M${bx - 20} ${by + 4 + tilt * -1} Q${bx} ${by - 4} ${bx + 20} ${by + 4 + tilt}" fill="none" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/>`);
  });
  // blush with hatch lines
  [-1, 1].forEach(sd => {
    const bx = cx + sd * 78, by = ey + 38;
    L.push(`<ellipse cx="${bx}" cy="${by}" rx="30" ry="16" fill="url(#blush)"/>`);
    L.push(`<path d="M${bx - 12} ${by + 5} l6 -10 M${bx - 2} ${by + 5} l6 -10 M${bx + 8} ${by + 5} l6 -10" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>`);
  });
  // nose
  L.push(`<path d="M${cx + 2} ${ey + 30} l-3 5" stroke="#d99a7c" stroke-width="3" stroke-linecap="round"/>`);
  // mouth
  const my = ey + 52;
  const mouths = {
    happy: `<path d="M${cx - 18} ${my - 4} Q${cx} ${my + 14} ${cx + 18} ${my - 4}" fill="none" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/>`,
    joy: `<path d="M${cx - 24} ${my - 8} Q${cx} ${my + 30} ${cx + 24} ${my - 8} Z" fill="#7a1e3a" stroke="${OL}" stroke-width="4.5" stroke-linejoin="round"/><path d="M${cx - 12} ${my + 10} Q${cx} ${my + 2} ${cx + 12} ${my + 10} Q${cx} ${my + 18} ${cx - 12} ${my + 10}Z" fill="#fb7185"/>`,
    shock: `<ellipse cx="${cx}" cy="${my + 6}" rx="14" ry="20" fill="#7a1e3a" stroke="${OL}" stroke-width="4.5"/><ellipse cx="${cx}" cy="${my + 16}" rx="8" ry="6" fill="#fb7185"/>`,
    confused: `<path d="M${cx - 18} ${my + 4} q9 -10 18 0 t18 0" fill="none" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/>`,
    wink: `<path d="M${cx - 20} ${my - 6} Q${cx} ${my + 22} ${cx + 20} ${my - 6} Z" fill="#7a1e3a" stroke="${OL}" stroke-width="4.5" stroke-linejoin="round"/><path d="M${cx - 8} ${my + 6} Q${cx} ${my + 14} ${cx + 8} ${my + 6}" fill="#fb7185"/>`,
    focus: `<path d="M${cx - 10} ${my} L${cx + 10} ${my}" stroke="${OL}" stroke-width="4.5" stroke-linecap="round"/>`,
  };
  L.push(mouths[expr] || mouths.happy);
  // manga marks
  if (expr === 'shock') {
    L.push(`<g stroke="#6366f1" stroke-width="4" stroke-linecap="round" opacity=".75">${[-40, -20, 0, 20, 40].map(d => `<path d="M${cx + d} ${ey - 118} l0 34"/>`).join('')}</g>`);
    L.push(`<path d="M${cx + 128} ${ey - 50} q14 26 0 40 q-14 -14 0 -40z" fill="#7dd3fc" stroke="${OL}" stroke-width="4"/>`);
  }
  if (expr === 'confused') L.push(`<path d="M${cx + 120} ${ey - 70} q16 30 0 46 q-16 -16 0 -46z" fill="#7dd3fc" stroke="${OL}" stroke-width="4"/>`);
  return L.join('');
}

// ---------- arms ----------
function arm(sx, sy, ang, sleeve, sleeveSh, hand = 'open', len = 108) {
  const w = 42;
  return `<g transform="rotate(${ang} ${sx} ${sy})">
    <path d="M${sx - w / 2} ${sy} L${sx - w / 2 + 3} ${sy + len - 14} Q${sx} ${sy + len + 4} ${sx + w / 2 - 3} ${sy + len - 14} L${sx + w / 2} ${sy} Z" fill="${sleeve}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>
    <path d="M${sx + 4} ${sy + 8} L${sx + w / 2 - 4} ${sy + 8} L${sx + w / 2 - 6} ${sy + len - 18} Q${sx + 8} ${sy + len - 8} ${sx + 4} ${sy + len - 20}Z" fill="${sleeveSh}" opacity=".9"/>
    <path d="M${sx - w / 2 + 4} ${sy + len - 18} Q${sx} ${sy + len - 6} ${sx + w / 2 - 4} ${sy + len - 18}" fill="none" stroke="${OL}" stroke-width="3.5" opacity=".6"/>
    <circle cx="${sx}" cy="${sy + len + 6}" r="21" fill="url(#skin)" stroke="${OL}" stroke-width="${SW}"/>
    ${hand === 'thumb' ? `<ellipse cx="${sx + 14}" cy="${sy + len - 10}" rx="8" ry="15" transform="rotate(-25 ${sx + 14} ${sy + len - 10})" fill="#ffe3cf" stroke="${OL}" stroke-width="4"/>` : ''}
    ${hand === 'point' ? `<ellipse cx="${sx}" cy="${sy + len + 30}" rx="7" ry="16" fill="#ffe3cf" stroke="${OL}" stroke-width="4"/>` : ''}
  </g>`;
}
const POSES = { // [leftAngle, rightAngle, leftHand, rightHand, armsInFront]
  down: [14, -14], wave: [14, -150], clutch: [150, -150], cheer: [160, -160], thumb: [14, -62, 'open', 'thumb'], type: [-38, 38], point: [14, -100, 'open', 'point'],
};

// ---------- person (Dev / teammate) ----------
function person({ expr = 'happy', pose = 'down', t = 0, hoodie = '#4f46e5', hoodieSh = '#3730a3', hoodieHi = '#6d67f5', hair = '#262c4a', hairHi = '#56608f', hairShine = '#8e98cc', iris = 'iris-indigo', style = 'short', clip = false }) {
  const id = 'p' + (uid++);
  const P = POSES[pose] || POSES.down;
  let [la, ra] = P; const lh = P[2] || 'open', rh = P[3] || 'open';
  if (pose === 'wave') ra += Math.sin(t * 12) * 16;
  if (pose === 'type') { la += Math.sin(t * 22) * 4; ra -= Math.cos(t * 20) * 4; }
  const cx = 200, cy = 190;
  const face = `M${cx - 118} ${cy + 2} C${cx - 120} ${cy - 88} ${cx - 64} ${cy - 124} ${cx} ${cy - 124} C${cx + 64} ${cy - 124} ${cx + 120} ${cy - 88} ${cx + 118} ${cy + 2} C${cx + 116} ${cy + 74} ${cx + 60} ${cy + 118} ${cx} ${cy + 120} C${cx - 60} ${cy + 118} ${cx - 116} ${cy + 74} ${cx - 118} ${cy + 2}Z`;
  const out = [];
  out.push(`<ellipse cx="200" cy="572" rx="120" ry="16" fill="#1e2436" opacity=".12"/>`);
  // back hair
  if (style === 'bob') out.push(`<path d="M${cx - 150} ${cy + 110} C${cx - 170} ${cy - 40} ${cx - 120} ${cy - 150} ${cx} ${cy - 152} C${cx + 120} ${cy - 150} ${cx + 170} ${cy - 40} ${cx + 150} ${cy + 110} C${cx + 110} ${cy + 130} ${cx - 110} ${cy + 130} ${cx - 150} ${cy + 110}Z" fill="${hair}" stroke="${OL}" stroke-width="${SW}"/>`);
  else out.push(`<path d="M${cx - 132} ${cy + 20} C${cx - 146} ${cy - 90} ${cx - 90} ${cy - 150} ${cx} ${cy - 150} C${cx + 90} ${cy - 150} ${cx + 146} ${cy - 90} ${cx + 132} ${cy + 20} Z" fill="${hair}" stroke="${OL}" stroke-width="${SW}"/>`);
  // legs & shoes
  [-1, 1].forEach(sd => {
    const lx = 200 + sd * 34;
    out.push(`<path d="M${lx - 24} 470 L${lx - 22} 535 L${lx + 22} 535 L${lx + 24} 470Z" fill="#2b3350" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
    out.push(`<path d="M${lx - 30 + sd * 4} 560 Q${lx - 32 + sd * 4} 530 ${lx + sd * 6} 530 Q${lx + 34 + sd * 8} 532 ${lx + 34 + sd * 8} 556 Q${lx + 34 + sd * 8} 566 ${lx + 20} 566 L${lx - 22} 566 Q${lx - 30 + sd * 4} 566 ${lx - 30 + sd * 4} 560Z" fill="#fff" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
    out.push(`<path d="M${lx - 28 + sd * 4} 558 L${lx + 32 + sd * 8} 558" stroke="${hoodie}" stroke-width="6"/>`);
  });
  // arms behind for down/type
  const armsBack = pose === 'down' || pose === 'type' || pose === 'thumb' || pose === 'point';
  const armSvg = arm(138, 330, la, hoodie, hoodieSh, lh) + arm(262, 330, ra, hoodie, hoodieSh, rh);
  if (!armsBack) out.push('');
  // hoodie body
  out.push(`<path d="M132 318 C112 340 106 400 112 476 Q200 492 288 476 C294 400 288 340 268 318 Q200 296 132 318Z" fill="${hoodie}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
  out.push(`<path d="M232 322 C262 330 280 360 284 474 Q260 482 236 484 C246 430 246 370 232 322Z" fill="${hoodieSh}" opacity=".85"/>`);
  out.push(`<path d="M140 340 C130 370 128 410 132 450" fill="none" stroke="${hoodieHi}" stroke-width="8" stroke-linecap="round" opacity=".7"/>`);
  out.push(`<path d="M150 410 Q200 398 250 410 L244 462 Q200 470 156 462Z" fill="none" stroke="${OL}" stroke-width="4" opacity=".55"/>`);
  // hood collar
  out.push(`<path d="M140 316 Q200 356 260 316 Q252 344 200 352 Q148 344 140 316Z" fill="${hoodieSh}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
  // drawstrings
  [-1, 1].forEach(sd => out.push(`<path d="M${200 + sd * 16} 346 Q${200 + sd * 20} 372 ${200 + sd * 16} 396" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><rect x="${200 + sd * 16 - 4}" y="394" width="8" height="12" rx="3" fill="#fcd34d" stroke="${OL}" stroke-width="2.5"/>`));
  if (armsBack) out.push(armSvg);
  // ears
  [-1, 1].forEach(sd => out.push(`<ellipse cx="${cx + sd * 116}" cy="${cy + 16}" rx="18" ry="24" fill="url(#skin)" stroke="${OL}" stroke-width="${SW}"/><path d="M${cx + sd * 116} ${cy + 6} q${sd * 8} 10 0 20" fill="none" stroke="#e7a98a" stroke-width="3"/>`));
  // face
  out.push(`<clipPath id="${id}f"><path d="${face}"/></clipPath>`);
  out.push(`<path d="${face}" fill="url(#skin)" stroke="${OL}" stroke-width="${SW}"/>`);
  // shadow under bangs (cel)
  out.push(`<g clip-path="url(#${id}f)"><path transform="translate(0 -8)" d="M${cx - 130} ${cy - 40} L${cx - 102} ${cy - 16} L${cx - 84} ${cy - 44} L${cx - 58} ${cy - 6} L${cx - 38} ${cy - 50} L${cx - 10} ${cy - 10} L${cx + 12} ${cy - 50} L${cx + 40} ${cy - 8} L${cx + 60} ${cy - 44} L${cx + 88} ${cy - 12} L${cx + 104} ${cy - 40} L${cx + 130} ${cy - 20} L${cx + 130} ${cy - 160} L${cx - 130} ${cy - 160}Z" fill="#f2b99a" opacity=".55"/>
    <path d="M${cx - 60} ${cy + 118} Q${cx} ${cy + 96} ${cx + 60} ${cy + 118}" fill="none" stroke="#f2b99a" stroke-width="14" opacity=".5"/></g>`);
  out.push(faceBits(expr, cx, cy + 34, iris));
  // bangs (front hair) — spiky anime locks
  out.push('<g transform="translate(0 -12)">');
  if (style === 'bob') {
    out.push(`<path d="M${cx - 124} ${cy + 30} C${cx - 136} ${cy - 90} ${cx - 76} ${cy - 142} ${cx} ${cy - 142} C${cx + 76} ${cy - 142} ${cx + 136} ${cy - 90} ${cx + 124} ${cy + 30} L${cx + 112} ${cy - 6} L${cx + 96} ${cy - 44} L${cx + 70} ${cy - 20} L${cx + 52} ${cy - 58} L${cx + 22} ${cy - 30} L${cx} ${cy - 60} L${cx - 26} ${cy - 28} L${cx - 54} ${cy - 60} L${cx - 76} ${cy - 22} L${cx - 100} ${cy - 50} L${cx - 110} ${cy - 4}Z" fill="${hair}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
    [-1, 1].forEach(sd => out.push(`<path d="M${cx + sd * 112} ${cy - 20} C${cx + sd * 140} ${cy + 30} ${cx + sd * 140} ${cy + 90} ${cx + sd * 120} ${cy + 124} C${cx + sd * 110} ${cy + 80} ${cx + sd * 104} ${cy + 30} ${cx + sd * 112} ${cy - 20}Z" fill="${hair}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`));
  } else {
    out.push(`<path d="M${cx - 124} ${cy + 16} C${cx - 136} ${cy - 96} ${cx - 72} ${cy - 142} ${cx + 6} ${cy - 142} C${cx + 84} ${cy - 142} ${cx + 138} ${cy - 94} ${cx + 124} ${cy + 14} L${cx + 104} ${cy - 30} L${cx + 88} ${cy - 2} L${cx + 70} ${cy - 50} L${cx + 42} ${cy - 10} L${cx + 26} ${cy - 56} L${cx - 4} ${cy - 14} L${cx - 16} ${cy - 60} L${cx - 44} ${cy - 12} L${cx - 62} ${cy - 54} L${cx - 88} ${cy - 6} L${cx - 102} ${cy - 40}Z" fill="${hair}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
    // ahoge
    out.push(`<path d="M${cx + 10} ${cy - 140} C${cx + 18} ${cy - 196} ${cx + 70} ${cy - 196} ${cx + 58} ${cy - 162} C${cx + 50} ${cy - 180} ${cx + 30} ${cy - 176} ${cx + 26} ${cy - 140}Z" fill="${hair}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
  }
  // hair lock highlights + angel ring shine
  out.push(`<path d="M${cx - 70} ${cy - 90} Q${cx - 60} ${cy - 70} ${cx - 66} ${cy - 50} M${cx + 30} ${cy - 110} Q${cx + 40} ${cy - 86} ${cx + 32} ${cy - 62} M${cx + 80} ${cy - 86} Q${cx + 88} ${cy - 66} ${cx + 82} ${cy - 44}" fill="none" stroke="${hairHi}" stroke-width="6" stroke-linecap="round"/>`);
  out.push(`<path d="M${cx - 92} ${cy - 104} Q${cx} ${cy - 146} ${cx + 94} ${cy - 104}" fill="none" stroke="${hairShine}" stroke-width="11" stroke-linecap="round" stroke-dasharray="46 14 22 12 60 14 30"/>`);
  out.push('</g>');
  if (clip) out.push(`<g transform="translate(${cx + 78} ${cy - 96}) rotate(18)"><path d="M0 -18 L5 -5 L19 -5 L8 3 L12 17 L0 9 L-12 17 L-8 3 L-19 -5 L-5 -5Z" fill="#fcd34d" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/></g>`);
  if (!armsBack) out.push(armSvg);
  return out.join('');
}

export const dev = (o = {}) => person({ ...o });
export const mate = (o = {}) => person({ hoodie: '#0d9488', hoodieSh: '#0b6b63', hoodieHi: '#2dd4bf', hair: '#6b3f22', hairHi: '#9c6440', hairShine: '#d19a6e', iris: 'iris-brown', style: 'bob', clip: true, ...o });

// ---------- UGT-kun (box mascot) ----------
export function ugt({ expr = 'happy', pose = 'down', t = 0 } = {}) {
  const out = [];
  const P = { down: [30, -30], cheer: [150, -150], wave: [30, -140], point: [8, -95], thumb: [30, -60], clutch: [150, -150], type: [30, -30] }[pose] || [30, -30];
  let [la, ra] = P; if (pose === 'wave') ra += Math.sin(t * 12) * 16;
  out.push(`<ellipse cx="200" cy="560" rx="120" ry="16" fill="#1e2436" opacity=".12"/>`);
  // antenna
  const sway = Math.sin(t * 3) * 8;
  out.push(`<path d="M226 146 Q${222 + sway / 2} 110 ${226 + sway} 84" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/>`);
  out.push(`<g transform="translate(${226 + sway} 70) rotate(${sway})"><path d="M0 -22 L6 -7 L22 -6 L10 4 L14 20 L0 11 L-14 20 L-10 4 L-22 -6 L-6 -7Z" fill="#fcd34d" stroke="${OL}" stroke-width="4.5" stroke-linejoin="round"/><circle cx="-5" cy="-4" r="3" fill="#fff"/></g>`);
  // feet
  [-1, 1].forEach(sd => out.push(`<ellipse cx="${200 + sd * 52}" cy="540" rx="34" ry="20" fill="#4f46e5" stroke="${OL}" stroke-width="${SW}"/><ellipse cx="${200 + sd * 52 - 8}" cy="533" rx="12" ry="5" fill="#8b86ff" opacity=".8"/>`));
  // arms (stick + mitten)
  const stick = (sx, sy, a) => `<g transform="rotate(${a} ${sx} ${sy})"><path d="M${sx} ${sy} Q${sx + 6} ${sy + 40} ${sx} ${sy + 78}" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><circle cx="${sx}" cy="${sy + 90}" r="19" fill="#fff" stroke="${OL}" stroke-width="${SW}"/></g>`;
  // back box: top + right side (rounded 3/4 box)
  out.push(`<path d="M96 178 L126 148 Q134 142 146 142 L318 142 Q340 142 340 164 L340 460 Q340 472 332 480 L302 506 L96 506Z" fill="#b9c3f5" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round"/>`);
  out.push(`<path d="M104 176 L130 150 Q136 146 146 146 L316 146 Q334 146 334 162 L306 190 L104 190Z" fill="#e0e7ff"/>`);
  out.push(`<path d="M150 160 L300 160" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/>`);
  // front face
  out.push(`<rect x="60" y="176" width="250" height="330" rx="38" fill="url(#box-front)" stroke="${OL}" stroke-width="${SW}"/>`);
  out.push(`<path d="M84 206 Q84 192 100 192 L140 192" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`);
  out.push(`<path d="M288 290 L288 470 Q288 484 274 488" fill="none" stroke="#e3e7f7" stroke-width="12" stroke-linecap="round"/>`);
  // band + label
  out.push(`<path d="M62 214 L308 214 L308 264 L62 264Z" fill="#4f46e5" stroke="${OL}" stroke-width="4"/>`);
  out.push(`<path d="M308 214 L338 186 L338 236 L308 264Z" fill="#3730a3" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/>`);
  out.push(`<path d="M66 220 L304 220" stroke="#8b86ff" stroke-width="4" opacity=".8"/>`);
  out.push(`<text x="185" y="253" text-anchor="middle" font-family="Inter,sans-serif" font-weight="900" font-size="38" letter-spacing="6" fill="#fff">UGT</text>`);
  // face on front
  out.push(faceBits(expr, 185, 356, 'iris-indigo'));
  out.push(stick(64, 340, la) + stick(338, 330, ra));
  return out.join('');
}

export function svg(inner, w = 400, h = 600) {
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs>${DEFS}</defs>${inner}</svg>`;
}
