"""Showcase soundtrack for showcase.html — 120 BPM, 30 bars + tail, D–Bm–G–A (Bm–G in the challenge).
Driving sizzle groove; every chapter cut, drop and fill is on the same beat grid as the visuals.
Instrument voices are shared with corporate/music.py and cm/music.py."""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
import wave

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
DUR = 120 * BEAT + 2.0
N = int(SR * DUR)
rng = np.random.default_rng(120)
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


# ---------- arrangement (bars, same grid as showcase.html) ----------
K, CLP, SN, H, HO, TB = kick(), clap(), snare(), hat(), hat(True), tamb()
bass = np.zeros(N); keys = np.zeros(N); padL = np.zeros(N)
CHS = [4, 6, 10, 16, 19, 22, 26, 28]
def section(bar):
    if bar < 2: return 'intro'
    if bar < 4: return 'build'
    if bar < 6: return 'tension'
    if bar < 26: return 'drive'
    if bar < 28: return 'lift'
    return 'close'
DARK = [(35, [59, 62, 66]), (43, [59, 62, 67])]
for bar in range(31):
    s = section(bar); root, notes = DARK[bar % 2] if s == 'tension' else chord(bar); t0 = T(bar)
    n = int(BAR * SR * 1.05); x = tt(n)
    seg = sum(saw(mtof(m + d), n, rng.random()) for m in notes + [notes[0] - 12] for d in (-.07, .07)) / 12
    seg = filt(seg, 'low', {'intro': 1200, 'tension': 900, 'close': 1500}.get(s, 2600)) * np.minimum(1, x / .25) * np.minimum(1, (n - np.arange(n)) / (SR * .3))
    i = idx(t0); padL[i:i + n] += seg[: N - i]
    if bar >= 30: continue
    # stabs on the offbeats
    if s in ('drive', 'lift', 'build'):
        for pos in (0, 1.5, 3):
            for m in notes: k = epiano(m, .45); i = idx(t0 + pos * BEAT); keys[i:i + len(k)] += k[: N - i] * .22
    if s == 'close':
        for m in notes: k = epiano(m, 1.8); i = idx(t0); keys[i:i + len(k)] += k[: N - i] * .3
        continue
    # 16th arp
    tones = notes + [notes[0] + 12]
    for e in range(16 if s != 'intro' else 8):
        st = e * BEAT / (4 if s != 'intro' else 2)
        m = tones[[0, 2, 1, 3, 2, 1, 3, 2][e % 8]] + 12
        add(glock(m, .3), t0 + st, .03 if s in ('intro', 'tension') else .038, .4 if e % 2 else -.4)
    if s == 'intro': continue
    for b in range(4):
        tb = t0 + b * BEAT
        if s == 'tension':
            if b in (0, 2): add(K, tb, .6); add_duck(tb, .4)
            if b == 2: add(SN, tb, .12)
        else:
            add(K, tb, .62); add_duck(tb, .4)
            if b % 2 == 1: add(CLP, tb, .2 if s != 'build' else .12, .1)
            add(HO, tb + BEAT / 2, .03, .3)
        for q in range(4): add(H, tb + q * BEAT / 4, (.02, .012, .03, .012)[q], -.3)
        if s in ('drive', 'lift'): add(TB, tb + BEAT * .75, .025, .4)
    if s == 'build':   # snare roll into the challenge
        if bar == 3:
            for j in range(16): add(SN, t0 + BEAT * 2 + j * BEAT / 8, .03 + j * .006)
    for e in range(8):
        if s == 'tension' and e % 2 == 0: continue
        m = root - 12 + (12 if e in (3, 7) and s == 'drive' else 0); nn = int(BEAT / 2 * SR * .75); xx = tt(nn)
        sig = (np.sin(2 * np.pi * mtof(m) * xx) * .7 + filt(saw(mtof(m), nn), 'low', 700) * .3) * np.minimum(1, xx / .005) * np.exp(-xx * 6)
        i = idx(t0 + e * BEAT / 2); bass[i:i + nn] += sig[: N - i]

# open: impact + slabs landing
add(hit(.9), 0, .35)
for i in range(6): add(pop(62 + i * 2, .09), T(0, .2) + i * .12 + .9, .05)
for k in range(3): add(glock(81 + k * 2, .7), T(0, 1 + k * .5), .05)
for i in range(8): add(pop(86, .05), T(1, 2) + i * .12, .025)
# chapter cuts: whoosh on the 0.7 s camera flight + downbeat accent
for b in CHS:
    add(whoosh(.7), T(b) - .7, .16); add(hit(.5), T(b), .16 if b in (6, 28) else .08)
# challenge statements
for k in range(3): add(boing() * .5 if k == 0 else hit(.6), T(4) + k * BEAT * 2.67, .08 if k else .06); add(epiano(47 - k, 1.2), T(4) + k * BEAT * 2.67, .12)
add(riser(BAR * 1.2), T(6) - BAR * 1.2, .14)
# architecture: labels + tier names
for i in range(6): add(pop(74 + i * 2, .08), T(6, 1.5) + (5 - i) * .22, .04)
# demo: typing, steps, module drops
for j in range(26): add(tick(), T(10, 1.4) + j * 1.3 / 26, .03, .2)
for t in (T(11, 2), T(12), T(12, 2), T(14), T(14, 3)): add(glock(86, .6), t, .05)
for i in range(6): add(pop(62 + i * 3, .09), T(12, 2) + i * .5 + .4, .06); add(K, T(12, 2) + i * .5 + .4, .1)
# design tokens + badges
add(pop(76, .15), T(16, .5) + .5, .07)
for i in range(6): add(pop(80 + i, .07), T(16, 1) + i * .2 + .35, .045)
for i in range(5): add(pop(88, .05), T(16, 2) + i * .15, .03)
# identity nodes + packets
for i in range(4): add(pop(70 + i * 3, .1), T(19, .8) + i * .35 + .3, .06)
for i in range(3): add(whoosh(.35) * .5, T(19, 2.2) + i * .45, .06)
# pipeline: a tone each time the fill passes a stage (E.io quartic, as in showcase.html)
def eio4(x): return 8 * x ** 4 if x < .5 else 1 - (-2 * x + 2) ** 4 / 2
for i in range(10):
    for s in np.linspace(0, 1, 3000):
        if eio4(s) * 9 >= i - .02:
            add(pop(72 + i * 2, .08), T(22, 2) + s * BAR * 1.25, .05 if i != 7 else .1); break
add(glock(88, 1.2), T(22, 2) + BAR * 1.25 * .9, .06)
for i in range(4): add(pop(90, .05), T(24, 1.6) + i * .2, .035)
# results: bars growing
add(riser(1.6), T(26, .8), .08)
for i in range(3): add(glock(81 + i * 4, .9), T(26, .8) + i * .25 + 1.2, .06)
# close
add(glock(86, 2.5), T(28), .1); add(glock(90, 2.5), T(28, .05), .07); add(glock(93, 2.5), T(28, .1), .05)
for i in range(3): add(pop(84, .06), T(29) + i * .12, .03)
x = tt(int(5 * SR))
fin = sum(np.sin(2 * np.pi * mtof(m) * x) * np.exp(-x * .7) for m in (50, 57, 62, 66, 69)) / 5
add(fin, T(30), .22)

bass *= duck; keys *= (.65 + .35 * duck); padL *= (.65 + .35 * duck)
mL = L + bass * .5 + keys * .5 + padL * .15
mR = R + bass * .5 + np.roll(keys, 250) * .5 + np.roll(padL, 400) * .15
st = np.stack([mL, mR], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)
st /= np.max(np.abs(st)) / .89
fi = int(.05 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(1.6 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print('ok', DUR, float(np.sqrt(np.mean(st ** 2))))
