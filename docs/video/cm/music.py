"""J-pop commercial soundtrack for cm.html — 128 BPM, 32 bars + tail.
Chords follow the J-pop "royal road" progression (IV–V–iii–vi = F G Em Am); every SFX sits on the beat grid used by the visuals."""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
import wave

SR = 44100
BPM = 128
BEAT = 60 / BPM
BAR = BEAT * 4
DUR = 32 * BAR + 1.5
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

# ---------- song map ----------
def sect(bar):
    if bar < 2: return 'hook'
    if bar < 6: return 'problem'
    if bar < 7: return 'break'
    if bar < 9: return 'reveal'
    if bar < 13: return 'groove'
    if bar < 19: return 'points'
    if bar < 26: return 'groove2'
    if bar < 28: return 'chorus'
    if bar < 31: return 'end'
    return 'final'
BAND = ('hook', 'reveal', 'groove', 'points', 'groove2', 'chorus', 'end')
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

# ---------- band ----------
K, CLP, SN, H, HO, TB = kick(), clap(), snare(), hat(), hat(True), tamb()
bass = np.zeros(N); keys = np.zeros(N)
MEL = {0: [81, None, 84, None, 86, 84, 81, None], 1: [83, None, 86, None, 88, 86, 83, None],
       2: [79, None, 83, None, 88, 86, 83, 79], 3: [81, None, 84, None, 88, None, 86, 84]}
for bar in range(32):
    s = sect(bar); root, notes = chord(bar); t0 = T(bar)
    if s in BAND or s == 'problem':
        for b in range(4):
            add(K, t0 + b * BEAT, .85); add_duck(t0 + b * BEAT)
            if b % 2 == 1: add(CLP, t0 + b * BEAT, .42, .1)
            add(HO, t0 + (b + .5) * BEAT, .1, .3)
            for q in range(4): add(H, t0 + (b + q / 4) * BEAT, .05 if q % 2 else .03, -.3)
            if s != 'problem': add(TB, t0 + (b + .5) * BEAT, .06, .5)
        # bass: octave-bouncing 8ths
        for e in range(8):
            m = root - 12 + (12 if e % 2 else 0); n = int(BEAT / 2 * SR * .85); x = tt(n)
            sig = (np.sin(2 * np.pi * mtof(m) * x) * .6 + filt(saw(mtof(m), n), 'low', 900) * .5) * np.minimum(1, x / .004) * np.exp(-x * 7)
            i = idx(t0 + e * BEAT / 2); bass[i:i + n] += sig[: N - i]
        # e-piano syncopated comping
        for pos in (0, 1.5, 2.5, 3.5) if s != 'problem' else (0, 2):
            for m in notes: k = epiano(m, .45); i = idx(t0 + pos * BEAT); keys[i:i + len(k)] += k[: N - i] * .3
    # glockenspiel hook melody
    if s in ('hook', 'reveal', 'points', 'chorus', 'end'):
        for e, m in enumerate(MEL[bar % 4]):
            if m: add(glock(m), t0 + e * BEAT / 2, .12 if s != 'points' else .09, .25)
    if s == 'chorus':
        for e, m in enumerate(MEL[bar % 4]):
            if m: add(lead(m - 12, .22), t0 + e * BEAT / 2, .12, -.1)
        for pos in (0, 1.5, 3): add(brass(notes, .3), t0 + pos * BEAT, .22)
    if s == 'reveal' or s == 'hook':
        add(brass(notes, .35), t0, .2); add(brass(notes, .2), t0 + 2.5 * BEAT, .14)
bass *= duck; keys *= (.6 + .4 * duck)

# ---------- scene sound design (same beat grid as the visuals) ----------
# hook: words pop, Dev pops up, zoom punch
for b in (0, 1, 2): add(pop(79 + b * 4), T(0, b), .22)
add(pop(72, .25), T(0, 3), .2); add(whoosh(.4), T(1, 2), .15)
# problems: NG stamp hit on beat 2 of each bar + dissonant stab + "eh?" boing
for i in range(4):
    bar = 2 + i
    add(whoosh(.35), T(bar) - .2, .18)
    add(hit(.55), T(bar, 2), .5); add(SN, T(bar, 2), .5); add(brass([60, 61, 66], .35), T(bar, 2), .28)
    add(boing(), T(bar, 1.5), .16, .4)
# break: silence, question sfx, drum roll + falling whistle
add(boing(), T(6, .2), .22)
t = T(6, 2)
while t < T(7):
    p = (t - T(6, 2)) / (2 * BEAT); add(SN, t, .12 + .35 * p); t += BEAT / (4 if p < .5 else 8)
add(riser(2 * BEAT), T(6, 2), .25); add(whistle_down(1.5 * BEAT), T(6, 2.5), .12)
# reveal: impact + fanfare
add(hit(1.0), T(7), 1.0); add(brass([60, 64, 67, 72], .6), T(7), .35); add(brass([65, 69, 72, 77], .5), T(7, 2), .3)
for k, m in enumerate([84, 88, 91, 96]): add(glock(m, 1.0), T(7, 2) + k * .06, .12)
# install: typing + ✓ + "easy!" burst
for a, d, c in ((1, 1.4, 20), (3.5, 1.4, 20), (6, .6, 8)):
    for j in range(c): add(tick(), T(9, a) + j * d * BEAT / c, .05, .3)
for b in (2.6, 5.1, 7.6): add(pop(88), T(9, b), .15)
add(pop(84, .2), T(10, 3), .2); add(glock(91), T(10, 3), .1)
# sentence: typing then slam
for j in range(34): add(tick(), T(11, 1) + j * 4 * BEAT / 34, .04, -.2)
add(hit(.5), T(12, 2), .45); add(brass([67, 71, 74, 79], .3), T(12, 2), .25); add(pop(91), T(12, 3.2), .16)
# points: wipe whoosh + "POINT" chime each bar, plus per-point events
for i in range(6):
    bar = 13 + i; add(whoosh(.45), T(bar) - .22, .16)
    for k, m in enumerate([79, 84, 88]): add(glock(m + i, .7), T(bar) + k * .07, .09)
for k in range(3): add(pop(86 + k * 2), T(13, .6 + (k + 1) * .75), .12)               # P1 findings
for k in range(4): add(pop(84 + k * 2), T(14, .5 + k * .8), .12)                     # P2 ticks
for k in range(5): add(hit(.25), T(15, k * .5 + .45), .22)                            # P3 blocks land
add(pop(88), T(15, 2.6), .12)
for k in range(3): add(whoosh(.3), T(16, 1 + k * .8), .1); add(pop(91), T(16, 1.25 + k * .8), .12)   # P4 flips
add(glock(79, .6), T(17, 1.2), .12); add(hit(.5), T(17, 2), .35); add(pop(96, .3), T(17, 3), .14)    # P5 shield
add(whoosh(.8), T(18, .5), .14); add(glock(88, 1.0), T(18, 2.1), .12)                               # P6 handoff
# verify: ✔ on 8ths, then stamp + fanfare
for k in range(7): add(pop(84 + k * 2), T(19, .5 + k * .5), .1, .2)
add(hit(.7), T(20, 1), .6); add(brass([60, 64, 67, 72], .5), T(20, 1), .3); add(pop(88), T(20, 2.5), .12)
# proof: count-up ticks, 100% burst, tiles
for j in range(24): add(pop(72 + j, .05), T(21, 1) + j * 3 * BEAT / 24, .05)
add(hit(.8), T(22), .7); add(brass([65, 69, 72, 77], .5), T(22), .3)
add(pop(88), T(22, 2), .14); add(pop(91), T(22, 3), .14)
# stickers: 16 pops on 8ths up a C-major scale
SC = [72, 74, 76, 77, 79, 81, 83, 84]
for i in range(16): add(pop(SC[i % 8] + 12 * (i // 8)), T(24) + i * BEAT / 2, .12, np.sin(i))
# happy: sparkles
for i in range(12): add(glock(88 + (i % 4) * 3, .5), T(26, 1 + i * .5), .05, np.sin(i * 2))
# end: jingle U-G-T ♪ then final chord
for k, m in enumerate([79, 84, 88]): add(glock(m, 1.2), T(30, k), .22); add(epiano(m - 12, .8), T(30, k), .2)
add(glock(91, 1.6), T(30, 3), .2); add(glock(96, 1.6), T(30, 3.08), .12)
add(hit(.8), T(31), .7)
x = tt(int(3.2 * SR))
fin = sum(np.sin(2 * np.pi * mtof(m) * x) * np.exp(-x * 1.2) + .25 * np.sin(2 * np.pi * mtof(m + 12) * x) * np.exp(-x * 2) for m in (48, 55, 60, 64, 67, 72)) / 6
add(fin, T(31), .45)
add(brass([60, 64, 67, 72], 1.0), T(31), .3)

# ---------- mix ----------
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
