"""Tech/electronic soundtrack for explainer.html (120 BPM, 86 s) — sound effects follow the on-screen program events."""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
import wave

SR = 44100
DUR = 86.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(23)
L = np.zeros(N); R = np.zeros(N)

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

def sweep(x, fcs, kind='low', block=512):
    out = np.zeros_like(x); zi = None
    for s in range(0, len(x), block):
        fc = float(np.clip(fcs[min(s, len(fcs) - 1)], 40, SR / 2 - 300))
        sos = butter(2, fc, kind, fs=SR, output='sos')
        if zi is None: zi = sosfilt_zi(sos) * 0
        out[s:s + block], zi = sosfilt(sos, x[s:s + block], zi=zi)
    return out

def saw(f, n, ph=0.0): return 2 * ((f * tt(n) + ph) % 1.0) - 1

# ---------- arrangement ----------
def sect(t):
    if t < 7: return 'intro'
    if t < 21: return 'light'
    if t < 35: return 'groove'
    if t < 52: return 'full'
    if t < 58: return 'groove'
    if t < 68: return 'tense'
    if t < 75: return 'break'
    if t < 80.8: return 'build'
    return 'outro'
DRIVE = ('groove', 'full', 'tense')

Am, F_, C_, G_, Dm, E_ = (45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62]), (50, [57, 62, 65]), (40, [56, 59, 64])
def chord(t):
    b = int(t // 2)
    if sect(t) in ('intro', 'tense'): return [Am, F_, Dm, E_][b % 4]
    return [Am, F_, C_, G_][b % 4]

# ---------- instruments ----------
def kick():
    n = int(.42 * SR); x = tt(n); f = 46 + 110 * np.exp(-x * 30)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7) + rng.standard_normal(n) * np.exp(-x * 400) * .2) * 1.5)
def clap():
    n = int(.26 * SR); x = tt(n); e = np.zeros(n)
    for o in (0, .011, .022):
        k = x >= o; e[k] += np.exp(-(x[k] - o) * (70 if o < .02 else 18))
    return filt(filt(rng.standard_normal(n) * e, 'high', 900), 'low', 7500)
def hat(op=False):
    n = int((.22 if op else .05) * SR)
    return filt(rng.standard_normal(n), 'high', 7500) * np.exp(-tt(n) * (14 if op else 75))
def pluck(m, d=.22, fc=3800):
    n = int(d * SR); x = tt(n); f = mtof(m)
    return filt((saw(f, n) + .5 * saw(f * 1.006, n)) * np.exp(-x * 13), 'low', fc)
def bell(m, d=1.2):
    n = int(d * SR); x = tt(n); f = mtof(m)
    return (np.sin(2 * np.pi * f * x) + .45 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 3)) * np.exp(-x * 3)
def blip(m, d=.09):
    n = int(d * SR); x = tt(n)
    return np.sin(2 * np.pi * mtof(m) * x) * np.exp(-x * 40) + .3 * np.sin(2 * np.pi * mtof(m + 12) * x) * np.exp(-x * 60)
def tick():
    n = int(.012 * SR); return filt(rng.standard_normal(n), 'high', 3500) * np.exp(-tt(n) / .003)
def whoosh(d=.7, up=True):
    n = int(d * SR); p = np.arange(n) / n
    return sweep(rng.standard_normal(n), 500 + 8000 * (p if up else 1 - p) ** 1.5) * np.sin(np.pi * p) ** 2
def riser(d):
    n = int(d * SR); p = np.arange(n) / n
    return sweep(rng.standard_normal(n), 300 + 9000 * p ** 2) * p ** 2 * .7 + np.sin(2 * np.pi * np.cumsum(220 + 1100 * p ** 2) / SR) * p ** 2 * .18
def impact(g=1):
    n = int(2 * SR); x = tt(n)
    return (np.tanh(np.sin(2 * np.pi * np.cumsum(40 + 70 * np.exp(-x * 9)) / SR) * np.exp(-x * 2.6) * 1.4) + filt(rng.standard_normal(n), 'high', 4000) * np.exp(-x * 2.5) * .25) * g
def glitch(d=.22):
    n = int(d * SR); blk = 300
    fr = np.repeat(rng.uniform(150, 2500, n // blk + 1), blk)[:n]
    g = np.repeat((rng.random(n // blk + 1) > .35).astype(float), blk)[:n]
    return filt(np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * g * np.exp(-tt(n) / d), 'low', 5000)
def alarm():
    out = np.zeros(int(.9 * SR))
    for k in range(3):
        n = int(.14 * SR); x = tt(n); m = 81 if k % 2 == 0 else 77
        s = np.sign(np.sin(2 * np.pi * mtof(m) * x)) * .5 * np.minimum(1, (n - np.arange(n)) / 300)
        i = int(k * .18 * SR); out[i:i + n] += filt(s, 'low', 3000)
    return out

# ---------- sidechain ----------
duck = np.ones(N)
def add_duck(t, depth=.55, rel=.25):
    i = idx(t); n = int(rel * SR)
    if i >= N: return
    e = 1 - depth * np.exp(-np.arange(n) / (SR * rel / 4)); duck[i:i + n] = np.minimum(duck[i:i + n], e[: N - i])

# ---------- drums ----------
K, CL, H, HO = kick(), clap(), hat(), hat(True)
for b in range(int(DUR / BEAT)):
    t = b * BEAT; s = sect(t)
    if s in DRIVE:
        add(K, t, .85); add_duck(t)
        if s in ('full', 'tense') and b % 2 == 1: add(CL, t, .36, .1)
        add(HO, t + BEAT / 2, .1 if s == 'groove' else .14, .3)
    elif s in ('light', 'build') and b % 2 == 0:
        add(K, t, .6); add_duck(t, .35)
    for q in range(4):
        tq = t + q * BEAT / 4
        if s in DRIVE: add(H, tq, .07 if q % 2 else .04, -.3)
        elif s in ('light', 'intro', 'break', 'build') and q % 2 == 0: add(H, tq, .03 + (.03 if s == 'build' else 0), .4)
# build snare roll into the finale
t = 78.8
while t < 80.8:
    p = (t - 78.8) / 2; add(CL, t, .1 + .3 * p); t += BEAT / (2 if p < .5 else 4)

# ---------- bass ----------
bass = np.zeros(N)
for e in range(int(DUR / (BEAT / 2))):
    t = e * BEAT / 2; s = sect(t)
    if s not in DRIVE + ('light',): continue
    if s == 'light' and e % 2 == 0: continue
    root, _ = chord(t); f = mtof(root - 12); n = int(BEAT / 2 * SR * .9); x = tt(n)
    sig = (np.sin(2 * np.pi * f * x) * .7 + filt(saw(f, n), 'low', 520 + 380 * (e % 2)) * .55) * np.minimum(1, x / .004) * np.exp(-x * 5.5)
    i = idx(t); bass[i:i + n] += sig[: N - i]
tt0 = tt(idx(7)); bass[: len(tt0)] += np.sin(2 * np.pi * 55 * tt0) * .18 * np.minimum(1, tt0 / 2)
bass *= duck

# ---------- pad ----------
pad = np.zeros(N)
for b in range(int(DUR / 2) + 1):
    t0 = b * 2.0
    if t0 >= DUR: break
    _, notes = chord(t0); n = int(2.25 * SR); sig = np.zeros(n)
    for m in notes + [notes[0] + 12]:
        for d in (-.08, .08): sig += saw(mtof(m + d), n, rng.random()) / 10
    sig *= np.minimum(1, tt(n) / .2) * np.minimum(1, (n - np.arange(n)) / (SR * .2))
    i = idx(t0); pad[i:i + n] += sig[: N - i]
ts = np.arange(N) / SR
pad = sweep(pad, np.interp(ts, [0, 7, 21, 35, 52, 58, 68, 75, 80.8, 86], [500, 1400, 2000, 2600, 2200, 1600, 900, 3000, 2400, 600])) * (.55 + .45 * duck)
pad *= np.interp(ts, [0, 2, 35, 68, 75, 80.8, 84, 86], [0, .8, .7, .9, .9, 1, .8, 0])

# ---------- arp ----------
PAT = [0, 1, 2, 3, 2, 1, 3, 2]
for q in range(int(DUR / (BEAT / 4))):
    t = q * BEAT / 4; s = sect(t)
    if t > 84: continue
    if s == 'intro' and q % 2: continue
    _, notes = chord(t); tones = notes + [notes[0] + 12]; m = tones[PAT[q % 8]] + 12
    g = {'intro': .07, 'light': .07, 'groove': .08, 'full': .08, 'tense': .08, 'break': .09, 'build': .09, 'outro': .06}[s]
    fc = {'intro': 1600, 'light': 2400, 'break': 2000}.get(s, 3800)
    if s == 'intro': g *= min(1, t / 2)
    add(pluck(m, fc=fc), t, g, .5 if q % 2 else -.5)
    add(pluck(m, fc=fc), t + .375, g * .35, -.5 if q % 2 else .5)

# ---------- lead (full section) ----------
MEL = {0: [76, 74, 72, 69], 1: [72, 69, 72, 77], 2: [79, 76, 74, 72], 3: [74, 71, 67, 71]}
def lead(m, d=.46):
    n = int(d * SR); x = tt(n); f = mtof(m) * (1 + .004 * np.sin(2 * np.pi * 5.5 * x)); ph = np.cumsum(f) / SR
    return filt((2 * (ph % 1) - 1) * .5 + np.sin(2 * np.pi * ph) * .5, 'low', 4200) * np.minimum(1, x / .01) * np.exp(-x * 2.4)
for b in range(18, 26):
    for k, m in enumerate(MEL[b % 4]): add(lead(m), b * 2 + k * .5, .12, .1)

# ---------- program events ----------
for j in range(24): add(tick(), .3 + j * .21 + rng.random() * .05, .05, .3)            # AI writing code
for i in range(4): add(glitch(), 2.2 + i * .55, .22, -.5 + i * .33); add(blip(50 + i, .2), 2.2 + i * .55, .15)
add(whoosh(.9), 6.4, .3); add(impact(.45), 7.2)
for a, d, c in ((8.2, 1.1, 22), (9.7, 1.0, 20), (11.0, .4, 7)):
    for j in range(c): add(tick(), a + j * d / c, .05, .25)
for tq in (9.4, 10.8, 11.5): add(blip(88), tq, .14)
for i in range(16): add(blip(72 + [0, 3, 7, 10, 12][i % 5] + 12 * (i // 10)), 11.6 + i * .13, .07, np.sin(i))
add(whoosh(.9), 14.8, .3)
for j in range(34): add(tick(), 16 + j * 1.9 / 34, .04, -.2)
add(blip(91, .15), 18.1, .16); add(whoosh(2.8, True), 18.2, .22); add(impact(.3), 21.2)
add(sweep(rng.standard_normal(int(2.4 * SR)), np.linspace(1500, 6000, int(2.4 * SR)), 'low') * .5 * np.sin(np.linspace(0, np.pi, int(2.4 * SR))), 22.2, .18)
for i in range(3): add(bell(69 + i * 2, .8), 24.8 + i * .8, .08)
for i in range(4): add(blip(84 + i * 2, .07), 30.6 + i * .8, .12)
add(whoosh(1.9), 34.4, .3)
for i in range(7):
    if i == 5: add(blip(45, .35), 36.3 + i * 2.2, .2); continue                        # Upload skipped
    for k, m in enumerate([72, 76, 79]): add(bell(m + i * 2 - (i > 5) * 2, 1.0), 36.3 + i * 2.2 + k * .06, .07, -.2 + k * .2)
    add(whoosh(.5), 36.3 + i * 2.2 + .6, .06)
for tq in (43.1, 45.3, 49.7): add(blip(79, .12), tq, .08)                               # reason cards
add(whoosh(1.0), 51.8, .3)
for i in range(7): add(blip(84 + i * 2, .08), 53.2 + i * .28, .1, .2)                  # ✔ verify lines
for k, m in enumerate([84, 88, 91, 96]): add(bell(m, 1.2), 55.4 + k * .07, .06)
add(whoosh(.6), 55.8, .15)
for j in range(20): add(tick(), 59 + j * 1.5 / 20, .045)
add(alarm(), 61.2, .22)
for k, m in enumerate([79, 83, 86]): add(bell(m, 1.2), 63.6 + k * .08, .08)
add(whoosh(1.0), 67.9, .3)
for i in range(6): add(blip(86 + i, .1), 69.6 + i * .32, .07, -.4 + i * .15); add(whoosh(.5), 69.5 + i * .32, .04)
for i in range(3): add(blip(91, .08), 72.4 + i * .45, .08)
add(whoosh(.8), 74.9, .25); add(riser(1.6), 76.1, .16)
for i in range(2): add(blip(88 + i * 3, .1), 77.6 + i * .35, .1)
add(riser(2.2), 78.6, .3); add(impact(.95), 80.8)
x = tt(int(5.2 * SR))
fin = sum(np.sin(2 * np.pi * mtof(m) * x) + .3 * np.sin(2 * np.pi * mtof(m + 12) * x) for m in (45, 52, 57, 60, 64)) / 6
add(fin * np.exp(-x * .45), 80.8, .3)

# ---------- mix ----------
mL = L + bass * .5 + pad * .2
mR = R + bass * .5 + np.roll(pad, 300) * .2
st = np.stack([mL, mR], 1)
st = np.tanh(st * 1.15) / np.tanh(1.15)
st /= np.max(np.abs(st)) / .89
fi = int(.03 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(1.5 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print('ok', float(np.sqrt(np.mean(st ** 2))))
