"""Corporate soundtrack for corp.html — 100 BPM, 128 beats + tail, D–Bm–G–A.
Calm pad/piano opening, light groove through the chapters, gentle UI cues on the same beat grid as the visuals.
Instrument voices are shared with cm/music.py."""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
import wave

SR = 44100
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4
DUR = 128 * BEAT + 2.4
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

def B(b): return b * BEAT
CH = [(38, [62, 66, 69]), (35, [59, 62, 66]), (43, [59, 62, 67]), (45, [61, 64, 69])]   # D Bm G A
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
bass = np.zeros(N); keys = np.zeros(N); padL = np.zeros(N)
def section(b):
    if b < 16: return 'intro'
    if b < 44: return 'light'
    if b < 112: return 'groove'
    if b < 120: return 'lift'
    return 'close'
for bar in range(32):
    b0 = bar * 4; s = section(b0); root, notes = chord(bar); t0 = T(bar)
    # pad (always)
    n = int(BAR * SR * 1.05); x = tt(n)
    seg = sum(saw(mtof(m + d), n, rng.random()) for m in notes + [notes[0] - 12] for d in (-.06, .06)) / 12
    seg = filt(seg, 'low', 1400 if s in ('intro', 'close') else 2200) * np.minimum(1, x / .4) * np.minimum(1, (n - np.arange(n)) / (SR * .4))
    i = idx(t0); padL[i:i + n] += seg[: N - i]
    # piano
    for pos in ((0, 2) if s in ('intro', 'close') else (0, 1.5, 2.5)):
        for m in notes: k = epiano(m, 1.4 if s == 'intro' else .7); i = idx(t0 + pos * BEAT); keys[i:i + len(k)] += k[: N - i] * .26
    if s == 'close': continue
    # arps from bar 2
    if bar >= 2:
        tones = notes + [notes[0] + 12]
        for e in range(8):
            m = tones[[0, 1, 2, 3, 2, 1, 2, 3][e]] + 12
            add(glock(m, .5), t0 + e * BEAT / 2, .035 if s == 'intro' else .045, .35 if e % 2 else -.35)
    if s == 'intro': continue
    # drums + bass
    for b in range(4):
        tb = t0 + b * BEAT
        if s == 'light':
            if b % 2 == 0: add(K, tb, .55); add_duck(tb, .3)
        else:
            add(K, tb, .6); add_duck(tb, .35)
            if b % 2 == 1: add(CLP, tb, .18 if s == 'groove' else .26, .1)
        for q in range(2): add(H, tb + q * BEAT / 2, .025 if q == 0 else .04, -.3)
        if s != 'light': add(TB, tb + BEAT / 2, .03, .4)
    for e in range(8):
        m = root - 12; nn = int(BEAT / 2 * SR * .8); xx = tt(nn)
        sig = (np.sin(2 * np.pi * mtof(m) * xx) * .7 + filt(saw(mtof(m), nn), 'low', 600) * .3) * np.minimum(1, xx / .006) * np.exp(-xx * 5)
        i = idx(t0 + e * BEAT / 2); bass[i:i + nn] += sig[: N - i]

# chapter changes: soft swell + low bell on the downbeat
for b in (16, 28, 44, 64, 80, 96, 112):
    add(whoosh(.9) * .6, B(b) - .75, .12); add(glock(74, 1.6), B(b), .08); add(epiano(50, 1.6), B(b), .12)
# 01 headline lines
for k, b in enumerate((1, 1.6, 2.2)): add(glock(81 + k * 2, .9), B(b), .06)
for i in range(5): add(pop(86, .06), B(5.5 + i * .55), .03)
# 02 cards
for i in range(3): add(pop(74 + i * 3, .1), B(18.5 + i * 1.2), .06)
# 03 architecture layers
for b in (30, 33.2, 33.6, 34, 36.2, 36.6): add(pop(72, .1), B(b), .05)
# 04 demo: typing, step completions, module chips
for j in range(40): add(tick(), B(46.2) + j * B(3) / 40, .025, .2)
for b in (50, 52.5, 55, 59, 61): add(glock(86, .8), B(b), .06)
for i in range(6): add(pop(79 + i * 2, .07), B(55.6 + i * .5), .05)
# 05 design badges
for i in range(6): add(pop(84 + i, .06), B(69.6 + i * .3), .04)
# 06 identity arrows + audit chips
for b in (83.5, 84.3, 85.1): add(pop(76, .1), B(b), .05)
for i in range(7): add(pop(86, .05), B(88 + i * .25), .03)
# 07 pipeline: a check each time the fill passes a stage (same easing as corp.html)
def eio(x): return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def eio4(x): return 8 * x ** 4 if x < .5 else 1 - (-2 * x + 2) ** 4 / 2
for i in range(10):
    for s in np.linspace(0, 1, 2000):
        if eio4(s) * 1578 >= i * 172 - 1:
            add(pop(79 + i, .08), B(99) + s * B(5.5), .05 if i != 7 else .09); break
for i in range(4): add(pop(88, .06), B(104.6 + i * .35), .04)
# 08 results + close
for j in range(20): add(pop(72 + j, .04), B(114.6) + j * .066, .025)
add(riser(B(3)), B(117), .12)
add(glock(86, 2.5), B(120), .12); add(glock(90, 2.5), B(120.05), .08); add(glock(93, 2.5), B(120.1), .06)
x = tt(int(7 * SR))
fin = sum(np.sin(2 * np.pi * mtof(m) * x) * np.exp(-x * .6) for m in (50, 57, 62, 66, 69)) / 5
add(fin, B(124), .25)

bass *= duck; keys *= (.7 + .3 * duck); padL *= (.7 + .3 * duck)
mL = L + bass * .45 + keys * .5 + padL * .16
mR = R + bass * .45 + np.roll(keys, 250) * .5 + np.roll(padL, 400) * .16
st = np.stack([mL, mR], 1)
st = np.tanh(st * 1.05) / np.tanh(1.05)
st /= np.max(np.abs(st)) / .89
fi = int(.5 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(2.0 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print('ok', DUR, float(np.sqrt(np.mean(st ** 2))))
