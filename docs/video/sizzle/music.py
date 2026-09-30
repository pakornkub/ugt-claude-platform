"""Sizzle-reel soundtrack for sizzle.html — 128 BPM, 80 beats + tail. Cold open hits → build → drop → hero → jingle.
Instruments are shared with cm/music.py; every cue sits on the same beat grid (G(beat)) as the shot list."""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
import wave

SR = 44100
BPM = 128
BEAT = 60 / BPM
BAR = BEAT * 4
DUR = 80 * BEAT + 1.5
N = int(SR * DUR)
rng = np.random.default_rng(128)
L = np.zeros(N); R = np.zeros(N)

def T(bar, beat=0.0): return (bar * 4 + beat) * BEAT
def idx(t): return int(round(t * SR))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(n): return np.arange(n) / SR

def add(sig, t, gain=1.0, pan=0.0):
    i = idx(t)
    if i >= N or i < 0: return
    sig = sig[: N - i]; a = (pan + 1) * np.pi / 4
    L[i:i + len(sig)] += sig * gain * np.cos(a) * 1.414
    R[i:i + len(sig)] += sig * gain * np.sin(a) * 1.414

def filt(x, kind, fc, order=2): return sosfilt(butter(order, fc, kind, fs=SR, output='sos'), x)
def sweep(x, fcs, kind='low', block=256):
    out = np.zeros_like(x); zi = None
    for s in range(0, len(x), block):
        fc = float(np.clip(fcs[min(s, len(fcs) - 1)], 40, SR / 2 - 300)); sos = butter(2, fc, kind, fs=SR, output='sos')
        if zi is None: zi = sosfilt_zi(sos) * 0
        out[s:s + block], zi = sosfilt(sos, x[s:s + block], zi=zi)
    return out
def saw(f, n, ph=0.0): return 2 * ((f * tt(n) + ph) % 1.0) - 1

def G(g): return g * BEAT
CH = [(41, [65, 69, 72]), (43, [67, 71, 74]), (40, [64, 67, 71]), (45, [69, 72, 76])]   # F G Em Am
def chord(bar): return CH[bar % 4]

# ---------- instruments ----------
def kick():
    n = int(.36 * SR); x = tt(n); f = 50 + 120 * np.exp(-x * 35)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9) + rng.standard_normal(n) * np.exp(-x * 500) * .25) * 1.5)
def clap():
    n = int(.24 * SR); x = tt(n); e = np.zeros(n)
    for o in (0, .009, .019):
        k = x >= o; e[k] += np.exp(-(x[k] - o) * (80 if o < .018 else 22))
    return filt(filt(rng.standard_normal(n) * e, 'high', 1000), 'low', 8000)
def snare():
    n = int(.2 * SR); x = tt(n)
    return filt(rng.standard_normal(n), 'high', 1500) * np.exp(-x * 22) * .8 + np.sin(2 * np.pi * 190 * x) * np.exp(-x * 30) * .5
def hat(op=False):
    n = int((.2 if op else .045) * SR); return filt(rng.standard_normal(n), 'high', 8000) * np.exp(-tt(n) * (15 if op else 85))
def tamb():
    n = int(.12 * SR); x = tt(n); return filt(rng.standard_normal(n), 'band', [6000, 12000]) * np.exp(-x * 30) * (1 + .5 * np.sin(2 * np.pi * 60 * x))
def epiano(m, d=.5):
    n = int(d * SR); x = tt(n); f = mtof(m)
    s = sum(a * np.sin(2 * np.pi * f * k * x) * np.exp(-x * dk) for k, a, dk in ((1, .6, 4), (2, .3, 7), (3, .12, 11), (4, .06, 16)))
    return s * np.minimum(1, x / .003)
def glock(m, d=.8):
    n = int(d * SR); x = tt(n); f = mtof(m)
    return (np.sin(2 * np.pi * f * x) + .4 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 6) + .2 * np.sin(2 * np.pi * f * 5.4 * x) * np.exp(-x * 10)) * np.exp(-x * 4.5)
def brass(notes, d=.28, g=1.0):
    n = int(d * SR); x = tt(n); s = np.zeros(n)
    for m in notes:
        for dt in (-.06, .06): s += saw(mtof(m + dt), n, rng.random())
    s /= 2 * len(notes)
    env = np.minimum(1, x / .01) * np.exp(-x * 5)
    return sweep(s, 700 + 4200 * np.exp(-x * 14)) * env * g
def lead(m, d=.22):
    n = int(d * SR); x = tt(n); f = mtof(m) * (1 + .003 * np.sin(2 * np.pi * 6 * x)); ph = np.cumsum(f) / SR
    return filt(np.sign(np.sin(2 * np.pi * ph)) * .35 + (2 * (ph % 1) - 1) * .35, 'low', 5000) * np.minimum(1, x / .006) * np.exp(-x * 5)
def pop(m, d=.12):
    n = int(d * SR); x = tt(n); f = mtof(m) * (1 + .7 * np.exp(-x * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 28)
def tick():
    n = int(.012 * SR); return filt(rng.standard_normal(n), 'high', 3500) * np.exp(-tt(n) / .003)
def whoosh(d=.45):
    n = int(d * SR); p = np.arange(n) / n
    return sweep(rng.standard_normal(n), 800 + 9000 * p ** 1.3) * np.sin(np.pi * p) ** 2
def hit(g=1.0):
    n = int(1.6 * SR); x = tt(n)
    return (np.tanh(np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-x * 12)) / SR) * np.exp(-x * 4) * 1.5) + filt(rng.standard_normal(n), 'high', 4500) * np.exp(-x * 3) * .3) * g
def boing():   # question / "eh?"
    n = int(.5 * SR); x = tt(n); f = 700 * np.exp(-x * 2.2) + 180 * np.sin(2 * np.pi * 9 * x) * np.exp(-x * 3)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 4)
def whistle_down(d):
    n = int(d * SR); p = np.arange(n) / n; f = 2200 - 1500 * p
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (.3 + .7 * p) * np.minimum(1, (n - np.arange(n)) / 500)
def riser(d):
    n = int(d * SR); p = np.arange(n) / n
    return sweep(rng.standard_normal(n), 300 + 9000 * p ** 2) * p ** 2 * .7

# ---------- sidechain ----------
duck = np.ones(N)
def add_duck(t, depth=.45, rel=.2):
    i = idx(t); n = int(rel * SR)
    if i >= N: return
    e = 1 - depth * np.exp(-np.arange(n) / (SR * rel / 4)); duck[i:i + n] = np.minimum(duck[i:i + n], e[: N - i])

# ---------- arrangement ----------
K, CLP, SN, H, HO, TB = kick(), clap(), snare(), hat(), hat(True), tamb()
bass = np.zeros(N); keys = np.zeros(N)
MEL = {0: [81, None, 84, None, 86, 84, 81, None], 1: [83, None, 86, None, 88, 86, 83, None],
       2: [79, None, 83, None, 88, 86, 83, 79], 3: [81, None, 84, None, 88, None, 86, 84]}

def band(bar, drums=True, bassline=True, comp=True, mel=False, lp=None, stabs=False, half=False):
    root, notes = chord(bar); t0 = T(bar)
    if drums:
        for b in range(4):
            if not half or b % 2 == 0: add(K, t0 + b * BEAT, .85); add_duck(t0 + b * BEAT)
            if (b % 2 == 1 and not half) or (half and b == 2): add(CLP, t0 + b * BEAT, .42, .1)
            add(HO, t0 + (b + .5) * BEAT, .08, .3)
            for q in range(4): add(H, t0 + (b + q / 4) * BEAT, .05 if q % 2 else .03, -.3)
            add(TB, t0 + (b + .5) * BEAT, .05, .5)
    if bassline:
        for e in range(8 if not half else 4):
            step = BEAT / 2 if not half else BEAT
            m = root - 12 + (12 if (e % 2 and not half) else 0); n = int(step * SR * .85); x = tt(n)
            sig = (np.sin(2 * np.pi * mtof(m) * x) * .6 + filt(saw(mtof(m), n), 'low', lp or 900) * .5) * np.minimum(1, x / .004) * np.exp(-x * (7 if not half else 3))
            i = idx(t0 + e * step); bass[i:i + n] += sig[: N - i]
    if comp:
        for pos in ((0, 1.5, 2.5, 3.5) if not half else (0, 2)):
            for m in notes: k = epiano(m, .45 if not half else 1.2); i = idx(t0 + pos * BEAT); keys[i:i + len(k)] += k[: N - i] * .3
    if mel:
        for e, m in enumerate(MEL[bar % 4]):
            if m and (not half or e % 2 == 0): add(glock(m), t0 + e * BEAT / 2 * (1 if not half else 1), .12, .25)
    if stabs:
        for pos in (0, .75, 1.5, 2.5, 3.25): add(brass(notes + [notes[0] + 12], .22), t0 + pos * BEAT, .2)

# ---- cold open (bar 0): three word slams, then whoosh into the messy city ----
for g, m in ((0, [60, 63, 67]), (1, [58, 62, 65]), (2, [56, 60, 63])):
    add(K, G(g), 1); add(hit(.7), G(g), .6); add(brass(m, .4), G(g), .3)
add(whoosh(.45), G(3) - .2, .25)
# ---- bar 1: filtered, tense groove under the problem shots ----
band(1, comp=False, lp=500)
add(hit(.5), G(7), .5); add(SN, G(7), .5); add(brass([60, 61, 66], .35), G(7), .25)
# ---- bar 2: "จนกระทั่ง…" breath, riser, falling box ----
add(hit(.6), G(8), .5); add(boing(), G(8.2), .15)
t = G(9)
while t < G(12):
    p = (t - G(9)) / G(3); add(SN, t, .1 + .35 * p); t += BEAT / (2 if p < .4 else 4 if p < .8 else 8)
add(riser(G(3)), G(9), .3); add(whistle_down(G(2)), G(9.4), .12); add(hit(.35), G(11.35), .3)
# ---- bar 3: reveal fanfare ----
add(hit(1.0), G(12), 1.0); add(brass([60, 64, 67, 72], .6), G(12), .35); add(brass([65, 69, 72, 77], .5), G(14), .3)
for k, m in enumerate([84, 88, 91, 96]): add(glock(m, 1.0), G(14) + k * .06, .12)
band(3, mel=True)
# ---- bar 4: install + sentence (typing) ----
band(4, mel=True)
for j in range(26): add(tick(), G(16) + j * G(2) / 26, .05, .3)
for j in range(30): add(tick(), G(18) + j * G(2) / 30, .04, -.2)
# ---- bars 5–7: build — cuts accelerate 1 → 1/2 beat, snare roll, riser ----
band(5, comp=False); band(6, comp=False, lp=1400)
for k in range(4): add(whoosh(.25), G(20 + k) - .12, .12); add(pop(72 + k * 3, .15), G(20 + k), .16); add(hit(.3), G(20 + k), .25)
for k in range(8): add(pop(79 + k * 2, .1), G(24 + k * .5), .15); add(SN, G(24 + k * .5), .15 + k * .03)
add(hit(.6), G(27), .45); add(brass([60, 64, 67, 72], .3), G(27), .25)            # ALL GREEN stamp
t = G(28)
while t < G(31.5):
    p = (t - G(28)) / G(3.5); add(SN, t, .12 + .4 * p); t += BEAT / (4 if p < .5 else 8)
add(riser(G(3.5)), G(28), .45); add(whoosh(1.2), G(28.6), .3)
# ---- bars 8–11: DROP ----
add(hit(1.0), G(32), 1.0)
for g in (32, 34, 36, 38): add(hit(.55), G(g), .5); add(brass([60, 64, 67, 72], .35), G(g), .3)
for bar in (8, 9, 10, 11): band(bar, mel=True, stabs=True)
for g in (40, 42, 44, 46): add(whoosh(.3), G(g) - .15, .15)
for j in range(12): add(pop(72 + j * 2, .05), G(44) + j * G(.66) / 12, .06)
add(hit(.6), G(44.67), .5); add(brass([65, 69, 72, 77], .4), G(44.67), .25)       # 100% burst
for j in range(10): add(pop([72, 74, 76, 77, 79, 81, 83, 84, 86, 88][j], .1), G(46 + j * .2), .12, np.sin(j))
# ---- bars 12–15: HERO (half-time, wide) ----
for bar in (12, 13, 14, 15): band(bar, half=True, mel=True, comp=True)
x = tt(int(G(16) * SR)); pad = np.zeros_like(x)
for bar in range(4):
    _, notes = chord(12 + bar); n0 = int(G(4) * bar * SR); n = int(G(4) * SR)
    seg = sum(saw(mtof(m + d), n, rng.random()) for m in notes + [notes[0] - 12] for d in (-.07, .07)) / 12
    pad[n0:n0 + n] += filt(seg, 'low', 2200) * np.minimum(1, np.arange(n) / (SR * .3)) * np.minimum(1, (n - np.arange(n)) / (SR * .3))
add(pad, G(48), .28)
add(hit(.8), G(48), .7)
for g, ms in ((52, [84, 88, 91]), (54, [86, 89, 93]), (56, [88, 91, 96])):
    for k, m in enumerate(ms): add(glock(m, 1.2), G(g) + k * .06, .1)
add(riser(G(4)), G(60), .35)
# ---- bars 16–19: end card + U・G・T jingle (same cues as cm.html's end card) ----
for bar in (16, 17): band(bar, mel=True)
band(18, mel=False)
for k, m in enumerate([79, 84, 88]): add(glock(m, 1.2), G(72 + k), .22); add(epiano(m - 12, .8), G(72 + k), .2)
add(glock(91, 1.6), G(75), .2); add(glock(96, 1.6), G(75.08), .12)
add(hit(.9), G(76), .8)
x = tt(int(3.2 * SR))
fin = sum(np.sin(2 * np.pi * mtof(m) * x) * np.exp(-x * 1.2) + .25 * np.sin(2 * np.pi * mtof(m + 12) * x) * np.exp(-x * 2) for m in (48, 55, 60, 64, 67, 72)) / 6
add(fin, G(76), .45); add(brass([60, 64, 67, 72], 1.0), G(76), .3)
add(hit(.8), G(64), .6)

bass *= duck; keys *= (.6 + .4 * duck)
mL = L + bass * .5 + keys * .5
mR = R + bass * .5 + np.roll(keys, 250) * .5
st = np.stack([mL, mR], 1)
st = np.tanh(st * 1.2) / np.tanh(1.2)
st /= np.max(np.abs(st)) / .89
fi = int(.01 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(1.0 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print('ok', DUR, float(np.sqrt(np.mean(st ** 2))))
