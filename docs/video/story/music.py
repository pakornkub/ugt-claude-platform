"""Bright, upbeat soundtrack for story.html (120 BPM, 72 s) — sound effects follow the story events."""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
import wave

SR = 44100
DUR = 72.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)

def idx(t): return int(round(t * SR))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(n): return np.arange(n) / SR

def add(sig, t, gain=1.0, pan=0.0):
    i = idx(t)
    if i >= N or i < 0: return
    sig = sig[: N - i]
    a = (pan + 1) * np.pi / 4
    L[i:i + len(sig)] += sig * gain * np.cos(a) * 1.414
    R[i:i + len(sig)] += sig * gain * np.sin(a) * 1.414

def filt(x, kind, fc, order=2):
    return sosfilt(butter(order, fc, kind, fs=SR, output='sos'), x)

def sweep(x, fcs, kind='low', block=512):
    out = np.zeros_like(x); zi = None
    for s in range(0, len(x), block):
        fc = float(np.clip(fcs[min(s, len(fcs) - 1)], 40, SR / 2 - 300))
        sos = butter(2, fc, kind, fs=SR, output='sos')
        if zi is None: zi = sosfilt_zi(sos) * 0
        out[s:s + block], zi = sosfilt(sos, x[s:s + block], zi=zi)
    return out

def saw(f, n, ph=0.0): return 2 * ((f * tt(n) + ph) % 1.0) - 1

# ---------- sections ----------
def sect(t):
    if t < 8: return 'intro'
    if t < 12: return 'install'
    if t < 20: return 'light'
    if t < 42: return 'groove'
    if t < 50: return 'chorus'
    if t < 56: return 'break'
    if t < 62: return 'groove'
    return 'outro'

C_, G_, Am, F_, Dm, E_ = (48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69]), (50, [62, 65, 69]), (40, [59, 64, 68])
def chord(t):
    b = int(t // 2)
    if t < 8: return [Am, F_, Dm, E_][b % 4]
    return [C_, G_, Am, F_][b % 4]

# ---------- instruments ----------
def marimba(m, d=0.35):
    n = int(d * SR); x = tt(n); f = mtof(m)
    return (np.sin(2 * np.pi * f * x) * np.exp(-x * 9) + 0.35 * np.sin(2 * np.pi * f * 4 * x) * np.exp(-x * 30)
            + 0.15 * np.sin(2 * np.pi * f * 10 * x) * np.exp(-x * 60))

def bell(m, d=1.4):
    n = int(d * SR); x = tt(n); f = mtof(m)
    return (np.sin(2 * np.pi * f * x) + 0.5 * np.sin(2 * np.pi * f * 2.76 * x) * np.exp(-x * 3) + 0.25 * np.sin(2 * np.pi * f * 5.4 * x) * np.exp(-x * 6)) * np.exp(-x * 2.6)

def pluck(m, d=0.25):
    n = int(d * SR); x = tt(n); f = mtof(m)
    s = saw(f, n) * 0.6 + np.sign(np.sin(2 * np.pi * f * x)) * 0.3
    return filt(s * np.exp(-x * 14), 'low', 4200)

def kick(soft=False):
    n = int(0.4 * SR); x = tt(n)
    f = 48 + 90 * np.exp(-x * 32)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * (9 if soft else 7))
    return np.tanh(s * 1.4 + rng.standard_normal(n) * np.exp(-x * 500) * .15)

def clap():
    n = int(0.25 * SR); x = tt(n); e = np.zeros(n)
    for o in (0, .01, .021):
        k = x >= o; e[k] += np.exp(-(x[k] - o) * (70 if o < .02 else 20))
    return filt(filt(rng.standard_normal(n) * e, 'high', 900), 'low', 7000)

def shaker():
    n = int(0.07 * SR); x = tt(n)
    return filt(rng.standard_normal(n), 'band', [5000, 11000]) * np.minimum(1, x / .006) * np.exp(-x * 45)

def thud(g=1):
    n = int(.35 * SR); x = tt(n)
    return (np.sin(2 * np.pi * np.cumsum(90 * np.exp(-x * 12) + 50) / SR) * np.exp(-x * 14) + filt(rng.standard_normal(n), 'low', 900) * np.exp(-x * 30) * .4) * g

def pop(m=84):
    n = int(.12 * SR); x = tt(n)
    f = mtof(m) * (1 + 0.6 * np.exp(-x * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 35)

def whoosh(d=.8, up=True):
    n = int(d * SR); p = np.arange(n) / n
    fc = 600 + 7000 * (p if up else 1 - p) ** 1.6
    return sweep(rng.standard_normal(n), fc) * np.sin(np.pi * p) ** 2

def riser(d):
    n = int(d * SR); p = np.arange(n) / n
    return sweep(rng.standard_normal(n), 300 + 8000 * p ** 2) * p ** 2 * .7 + np.sin(2 * np.pi * np.cumsum(300 + 900 * p ** 2) / SR) * p ** 2 * .15

def impact(g=1):
    n = int(2 * SR); x = tt(n)
    boom = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-x * 9)) / SR) * np.exp(-x * 3)
    shim = filt(rng.standard_normal(n), 'high', 5000) * np.exp(-x * 2.2) * .18
    return (np.tanh(boom * 1.3) + shim) * g

def tick():
    n = int(.012 * SR)
    return filt(rng.standard_normal(n), 'high', 3500) * np.exp(-tt(n) / .003)

# ---------- sidechain ----------
duck = np.ones(N)
def add_duck(t, depth=.5, rel=.25):
    i = idx(t); n = int(rel * SR)
    if i >= N: return
    e = 1 - depth * np.exp(-np.arange(n) / (SR * rel / 4))
    duck[i:i + n] = np.minimum(duck[i:i + n], e[: N - i])

# ---------- drums ----------
K, KS, CL, SH = kick(), kick(True), clap(), shaker()
for b in range(int(DUR / BEAT)):
    t = b * BEAT; s = sect(t)
    if s in ('groove', 'chorus'):
        add(K, t, .8); add_duck(t)
        if b % 2 == 1: add(CL, t, .38, .1)
    elif s == 'light' and b % 2 == 0:
        add(KS, t, .55); add_duck(t, .3)
    elif s == 'outro' and t < 64 and b % 2 == 0:
        add(KS, t, .5)
    for q in range(4 if s in ('groove', 'chorus') else 2):
        tq = t + q * BEAT / (4 if s in ('groove', 'chorus') else 2)
        if s in ('groove', 'chorus', 'light'): add(SH, tq, .09 if q % 2 else .05, .35)
        elif s == 'break' and q == 1: add(SH, tq, .05, .35)

# ---------- bass ----------
bass = np.zeros(N)
for e in range(int(DUR / (BEAT / 2))):
    t = e * BEAT / 2; s = sect(t)
    if s not in ('light', 'groove', 'chorus'): continue
    if s == 'light' and e % 2 == 0: continue
    root, _ = chord(t); f = mtof(root - 12)
    n = int(BEAT / 2 * SR * .92); x = tt(n)
    sig = np.sin(2 * np.pi * f * x) * .8 + filt(saw(f, n), 'low', 700) * .4
    sig *= np.minimum(1, x / .004) * np.exp(-x * 5)
    i = idx(t); bass[i:i + n] += sig[: N - i]
bass *= duck

# ---------- pad ----------
pad = np.zeros(N)
for b in range(int(DUR / 2)):
    t0 = b * 2.0; _, notes = chord(t0)
    n = int(2.25 * SR); sig = np.zeros(n)
    for m in notes + [notes[0] + 12]:
        for d in (-.07, .07): sig += saw(mtof(m + d), n, rng.random()) / 10
    sig *= np.minimum(1, tt(n) / .25) * np.minimum(1, (n - np.arange(n)) / (SR * .25))
    i = idx(t0); pad[i:i + n] += sig[: N - i]
ts = np.arange(N) / SR
cut = np.interp(ts, [0, 8, 12, 20, 42, 50, 56, 62, 68, 72], [900, 1500, 2600, 2400, 2800, 3200, 1800, 2800, 1600, 700])
pad = sweep(pad, cut) * (.6 + .4 * duck)
padg = np.interp(ts, [0, 2, 8, 12, 20, 50, 56, 62, 66, 72], [0, .8, .8, .7, .6, .9, .6, .8, .6, 0])
pad *= padg

# ---------- marimba arp ----------
PAT = [0, 1, 2, 3, 2, 1, 2, 3]
for q in range(int(DUR / (BEAT / 2))):
    t = q * BEAT / 2; s = sect(t)
    if t > 70: continue
    _, notes = chord(t); tones = notes + [notes[0] + 12]
    m = tones[PAT[q % 8]] + 12
    g = {'intro': .16, 'install': .14, 'light': .15, 'groove': .12, 'chorus': .11, 'break': .15, 'outro': .13}[s]
    if s == 'intro' and t < 1.5: g *= t / 1.5
    add(marimba(m), t, g, -.35 if q % 2 else .35)

# ---------- groove pluck 16ths ----------
for q in range(int(DUR / (BEAT / 4))):
    t = q * BEAT / 4; s = sect(t)
    if s not in ('groove', 'chorus'): continue
    _, notes = chord(t)
    if q % 4 == 3: continue
    add(pluck(notes[(q // 2) % 3] + 12), t, .07, .5 if q % 2 else -.5)
    add(pluck(notes[(q // 2) % 3] + 12), t + .375, .025, -.5 if q % 2 else .5)  # echo

# ---------- chorus lead melody ----------
MEL = {0: [76, 74, 72, 67], 1: [74, 72, 71, 67], 2: [72, 71, 69, 64], 3: [69, 72, 74, 77]}
def lead(m, d=.45):
    n = int(d * SR); x = tt(n); f = mtof(m) * (1 + .004 * np.sin(2 * np.pi * 5.5 * x))
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) * .5 + np.sin(2 * np.pi * ph) * .6
    return filt(s, 'low', 3800) * np.minimum(1, x / .015) * np.exp(-x * 2.2)
for b in range(21, 25):  # 42..50
    for k, m in enumerate(MEL[b % 4]):
        add(lead(m), b * 2 + k * .5, .15, .1)
for b in range(28, 31):  # 56..62 softer echo
    for k, m in enumerate(MEL[b % 4]):
        add(lead(m), b * 2 + k * .5, .08, -.1)

# ---------- story sound effects ----------
for k in range(3):  # typing at 0..3.2
    for j in range(10): add(tick(), .2 + k + j * .1 + rng.random() * .04, .05, .3)
add(thud(), 5.95, .5); add(thud(), 6.45, .3); add(thud(), 6.75, .15)          # block falls & bounces
for j in range(22): add(tick(), 8.3 + j * 1.4 / 22, .06, .3)                   # typing the command
add(riser(1.3), 9.9, .35); add(whoosh(1.0, False), 10.2, .25)
add(impact(.7), 11.25)                                                          # box lands
for i in range(5): add(pop(79 + [0, 2, 4, 7, 9][i]), 11.7 + i * .22, .18, -.4 + i * .2)  # stations rise
add(pop(88), 13.4, .15)                                                         # speech bubble
for j in range(30): add(tick(), 13.6 + j * 1.8 / 30, .035, -.2)
add(pop(76), 15.2, .2)                                                          # pallet appears
STN = [(20.3, [72, 76, 79]), (24.3, [74, 77, 81]), (28.4, [76, 79, 84]), (32.4, [77, 81, 84]), (36.3, [79, 83, 86])]
for t0, ch in STN:
    for k, m in enumerate(ch): add(bell(m), t0 + k * .08, .09, -.2 + k * .2)
add(thud(), 21.2, .45); add(thud(.6), 21.25, .2); [add(thud(.5), 21.6 + i * .28, .25) for i in range(3)]  # slab & DB drums
add(whoosh(1.4), 25.3, .12)                                                     # quality scan
add(pop(91), 26.0, .12); add(pop(93), 26.35, .12)                               # ✓ ticks
add(whoosh(1.0), 28.4, .15); add(thud(.7), 29.9, .3)                            # building grows / roof lands
add(bell(84, 2.0), 33.0, .1)                                                    # shield
for j in range(3): add(pop(84 + j * 3), 36.3 + j * .45, .16)                    # CI/CD lights
add(riser(1.6), 36.3, .3); add(whoosh(1.2), 37.8, .35); add(whoosh(1.6, False), 38.6, .25)
add(impact(.8), 40.5)                                                           # landing
for j, m in enumerate([84, 88, 91]): add(bell(m), 40.9 + j * .1, .08)           # ALL GREEN
add(whoosh(2.4), 41.8, .3)                                                      # transformation wave
for i in range(14): add(pop(84 + (i % 5) * 2), 42.2 + i * .28, .06, np.sin(i))  # buildings snapping
add(riser(1.2), 48.8, .15); add(impact(.45), 50.0)                              # library rises
for i in range(10): add(pop(96), 51.5 + i * .14, .05, np.sin(i * 2))            # links
add(bell(88, 2.0), 54.2, .12); add(bell(91, 2.0), 54.35, .08)                   # note delivered
for i, t0 in enumerate([57.0, 57.5, 58.0]): add(pop(86 + i * 3), t0, .16)       # stats
add(riser(1.6), 60.6, .25); add(impact(.9), 62.2)                               # end card
x = tt(int(9.5 * SR))
fin = sum(np.sin(2 * np.pi * mtof(m) * x) + .3 * np.sin(2 * np.pi * mtof(m + 12) * x) for m in (48, 55, 60, 64, 67)) / 6
add(fin * np.exp(-x * .35), 62.2, .3)

# ---------- mix ----------
mL = L + bass * .5 + pad * .2
mR = R + bass * .5 + np.roll(pad, 300) * .2
st = np.stack([mL, mR], 1)
st = np.tanh(st * 1.1) / np.tanh(1.1)
st /= np.max(np.abs(st)) / .89
fi = int(.03 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(2.0 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print('ok', float(np.sqrt(np.mean(st ** 2))))
