"""Synthesize an energetic tech/electronic soundtrack synced to promo.html (120 BPM, 77 s)."""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
import wave

SR = 44100
DUR = 77.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)

def idx(t): return int(round(t * SR))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(sig, t, gain=1.0, pan=0.0):
    i = idx(t)
    if i >= N: return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414
    R[i:i + len(sig)] += sig * gain * r * 1.414

def filt(x, kind, fc, order=2):
    fc = np.clip(fc, 20, SR / 2 - 100)
    return sosfilt(butter(order, fc, kind, fs=SR, output='sos'), x)

def sweep_filter(x, fcs, kind='low', block=512):
    """time-varying filter: fcs is array (per sample) of cutoffs; processed per block carrying state."""
    out = np.zeros_like(x); zi = None
    for s in range(0, len(x), block):
        fc = float(np.clip(fcs[min(s, len(fcs) - 1)], 30, SR / 2 - 200))
        sos = butter(2, fc, kind, fs=SR, output='sos')
        if zi is None: zi = sosfilt_zi(sos) * 0
        out[s:s + block], zi = sosfilt(sos, x[s:s + block], zi=zi)
    return out

def env_exp(n, tau): return np.exp(-np.arange(n) / (SR * tau))

def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + phase) % 1.0) - 1

# ---------------- sections ----------------
# intro 0-8 | drop 8-52 | breakdown 52-58 | drop2 58-74 | outro 74-77
def energy(t):
    if t < 8: return 0
    if 52 <= t < 58: return 0
    if t >= 74: return 0
    return 1

# chord progression per bar (2 s): Am  F  C  G  (roots)
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
def chord_at(t): return PROG[int(t // 2) % 4]

# ---------------- drums ----------------
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7)
    click = rng.standard_normal(n) * np.exp(-t * 400) * 0.3
    return np.tanh((s + click) * 1.6)

def clap():
    n = int(0.3 * SR); t = np.arange(n) / SR
    no = rng.standard_normal(n)
    e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        k = t >= o; e[k] += np.exp(-(t[k] - o) * (60 if o < 0.02 else 18))
    return filt(filt(no * e, 'high', 800), 'low', 6000)

def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR); t = np.arange(n) / SR
    return filt(rng.standard_normal(n), 'high', 7000) * np.exp(-t * (14 if open_ else 70))

K, C, H, HO = kick(), clap(), hat(), hat(True)

# duck envelope (sidechain) built from kick times
duck = np.ones(N)
def add_duck(t, depth=0.65, rel=0.28):
    i = idx(t); n = int(rel * SR)
    if i >= N: return
    e = 1 - depth * np.exp(-np.arange(n) / (SR * rel / 4))
    duck[i:i + n] = np.minimum(duck[i:i + n], e[: N - i])

for b in range(int(DUR / BEAT)):
    t = b * BEAT
    if energy(t):
        add(K, t, 0.95); add_duck(t)
        if b % 2 == 1: add(C, t, 0.45, 0.1)
        add(HO, t + BEAT / 2, 0.16, 0.3)
    # 16th hats: quiet in intro (from 2s), full in drops
    for s in range(4):
        ts = t + s * BEAT / 4
        if energy(ts):
            add(H, ts, 0.10 if s % 2 else 0.06, -0.3 + 0.2 * s)
        elif 2 <= ts < 8 and s % 2 == 0:
            add(H, ts, 0.035 + 0.03 * (ts - 2) / 6, 0.4)
        elif 52 <= ts < 58 and s % 2 == 0:
            add(H, ts, 0.04, 0.4)

# snare roll builds before drops
def roll(t0, t1):
    t = t0; step = BEAT / 2
    while t < t1:
        p = (t - t0) / (t1 - t0)
        add(C, t, 0.12 + 0.35 * p, 0)
        if p > 0.5: step = BEAT / 4
        if p > 0.85: step = BEAT / 8
        t += step
roll(6.0, 8.0); roll(56.0, 58.0)

# ---------------- bass ----------------
bass = np.zeros(N)
for b in range(int(DUR / (BEAT / 2))):
    t = b * BEAT / 2
    if not energy(t): continue
    root, _ = chord_at(t)
    f = mtof(root - 24)
    n = int(BEAT / 2 * SR * 0.95)
    s = saw(f, n) * 0.6 + saw(f * 1.005, n) * 0.4 + np.sin(2 * np.pi * f / 2 * np.arange(n) / SR) * 0.8
    e = np.minimum(1, np.arange(n) / (SR * 0.004)) * np.exp(-np.arange(n) / (SR * 0.18))
    seg = filt(s * e, 'low', 380 + 500 * (b % 2))
    i = idx(t); bass[i:i + n] += seg[: N - i]
# intro sub rumble 0-8
tt = np.arange(idx(8)) / SR
bass[: len(tt)] += np.sin(2 * np.pi * 55 * tt) * 0.2 * np.minimum(1, tt / 3)
bass *= duck

# ---------------- pad ----------------
pad = np.zeros(N)
for bar in range(int(DUR / 2) + 1):
    t0 = bar * 2.0
    if t0 >= DUR: break
    _, notes = chord_at(t0)
    n = int(2.2 * SR)
    s = np.zeros(n)
    for m in notes:
        for d in (-0.08, 0.0, 0.08):
            s += saw(mtof(m + d), n, phase=rng.random()) / 9
        s += saw(mtof(m - 12), n) / 12
    fade = np.minimum(1, np.arange(n) / (SR * 0.15)) * np.minimum(1, (n - np.arange(n)) / (SR * 0.2))
    i = idx(t0); pad[i:i + n] += (s * fade)[: N - i]
ts = np.arange(N) / SR
cut = np.where(ts < 8, 300 + 2200 * (ts / 8) ** 2,
      np.where((ts >= 52) & (ts < 58), 700 + 2500 * ((ts - 52) / 6) ** 2,
      np.where(ts >= 74, 1800 * np.exp(-(ts - 74)), 2600)))
pad = sweep_filter(pad, cut)
pad = pad * (0.55 + 0.45 * duck)

# ---------------- arp (pluck 16ths) with ping-pong delay ----------------
arpL = np.zeros(N); arpR = np.zeros(N)
PAT = [0, 1, 2, 1, 2, 0, 3, 2]
for s16 in range(int(DUR / (BEAT / 4))):
    t = s16 * BEAT / 4
    if t < 4 or t >= 74: continue
    _, notes = chord_at(t)
    tones = notes + [notes[0] + 12]
    m = tones[PAT[s16 % 8]] + 12
    if energy(t) == 0 and not (52 <= t < 58) and t < 4: continue
    n = int(0.22 * SR)
    f = mtof(m)
    x = (saw(f, n) + 0.5 * np.sign(np.sin(2 * np.pi * f * 2 * np.arange(n) / SR))) * np.exp(-np.arange(n) / (SR * 0.07))
    x = filt(x, 'low', 3500 if energy(t) else 1800)
    g = 0.13 if energy(t) else 0.08
    if t < 8: g *= (t - 4) / 4
    i = idx(t)
    arpL[i:i + n] += x[: N - i] * g; arpR[i:i + n] += x[: N - i] * g
dl = idx(0.375)
dL = np.zeros(N); dR = np.zeros(N)
dL[dl:] += arpR[:-dl] * 0.45; dR[2 * dl:] += arpL[:-2 * dl] * 0.35

# ---------------- lead stabs on drop2 + intro-to-drop ----------------
lead = np.zeros(N)
def stab(t, notes, g=0.16, dur=0.35):
    n = int(dur * SR)
    x = sum(saw(mtof(m + 12), n) + saw(mtof(m + 12.1), n) for m in notes) / (2 * len(notes))
    x = filt(x * np.exp(-np.arange(n) / (SR * 0.12)), 'low', 5000)
    i = idx(t); lead[i:i + n] += x[: N - i] * g
for bar in range(int(58 / 2), int(74 / 2)):
    t0 = bar * 2
    _, notes = chord_at(t0)
    for off in (0, 0.75, 1.5):
        stab(t0 + off, notes)

# ---------------- FX: risers, impacts, whooshes, blips ----------------
def riser(t0, t1, g=0.35):
    n = idx(t1) - idx(t0); tt = np.arange(n) / SR; p = tt / tt[-1]
    no = rng.standard_normal(n)
    x = sweep_filter(no, 400 + 9000 * p ** 2, 'low') * p ** 2
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1400 * p ** 2) / SR) * 0.3 * p ** 2
    add(x + tone, t0, g)

def impact(t, g=0.9):
    n = int(2.2 * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt * 8)) / SR) * np.exp(-tt * 2.2)
    crash = filt(rng.standard_normal(n), 'high', 3000) * np.exp(-tt * 2.5) * 0.35
    add(np.tanh(boom * 1.4) + crash, t, g)

def whoosh(t_end, d=0.6, g=0.25):
    n = int(d * SR); p = np.arange(n) / n
    x = sweep_filter(rng.standard_normal(n), 800 + 7000 * p ** 1.5, 'low') * np.sin(np.pi * p) ** 2
    add(x, t_end - d, g, -0.4); add(x[::-1] * 0.5, t_end, g * 0.6, 0.4)

def blip(t, m=84, g=0.12, d=0.09):
    n = int(d * SR); tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * mtof(m) * tt) * np.exp(-tt * 40) + 0.3 * np.sin(2 * np.pi * mtof(m + 12) * tt) * np.exp(-tt * 60)
    add(x, t, g, 0.2)

def glitch(t, d=0.25, g=0.18):
    n = int(d * SR)
    x = np.sign(np.sin(2 * np.pi * np.repeat(rng.uniform(200, 3000, n // 400 + 1), 400)[:n] * np.arange(n) / SR))
    x *= (rng.random(n // 400 + 1) > 0.4).repeat(400)[:n] * np.exp(-np.arange(n) / (SR * d))
    add(filt(x, 'low', 6000), t, g)

riser(4.0, 8.0, 0.4); impact(8.0, 1.0)
riser(54.0, 58.0, 0.35); impact(58.0, 0.85)
for c in (16, 24, 36, 44, 52, 66):
    whoosh(c, 0.5, 0.22); impact(c, 0.35)
impact(74.0, 1.0)
for tg in (0.9, 3.9, 16.2, 24.15, 36.2, 44.2, 52.2, 58.2):
    glitch(tg, 0.2, 0.12)
for tg in (0.0, 0.3):
    glitch(tg, 0.3, 0.16)
# pipeline node checks (27..33) + stamp
for i in range(7):
    blip(27.0 + i, 79 + [0, 2, 4, 7, 9, 12, 14][i], 0.16)
blip(33.3, 91, 0.2, 0.2); blip(33.35, 96, 0.14, 0.2)
# terminal typing ticks
def ticks(t0, d, count, g=0.04):
    for k in range(count):
        n = int(0.012 * SR)
        add(filt(rng.standard_normal(n), 'high', 3000) * np.exp(-np.arange(n) / (SR * 0.003)), t0 + d * k / count, g, 0.3)
ticks(16.9, 1.2, 26); ticks(18.5, 1.1, 24); ticks(20.0, 0.45, 8); ticks(21.0, 0.25, 4); ticks(24.6, 1.7, 30)
blip(26.5, 88, 0.16, 0.15)
for i in range(16):
    blip(36.5 + i * 0.2, 86 + (i % 4) * 2, 0.05, 0.05)
# final sustained chord tail 74-77
n = int(3 * SR); tt = np.arange(n) / SR
tail = sum(np.sin(2 * np.pi * mtof(m) * tt) + 0.5 * np.sin(2 * np.pi * mtof(m + 12) * tt) for m in (57, 60, 64, 69)) / 6
add(tail * np.exp(-tt * 1.1), 74.0, 0.35)

# ---------------- mix ----------------
mixL = L * 1.0 + bass * 0.55 + pad * 0.22 + arpL + dL + lead * duck
mixR = R * 1.0 + bass * 0.55 + pad * 0.22 + arpR + dR + lead * duck
# stereo pad width
mixR += np.roll(pad, 441) * 0.06
st = np.stack([mixL, mixR], 1)
st = np.tanh(st * 1.2) / np.tanh(1.2)
st /= np.max(np.abs(st)) / 0.89
# fades
fi = int(0.05 * SR); st[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(1.2 * SR); st[-fo:] *= np.linspace(1, 0, fo)[:, None]
pcm = (st * 32767).astype('<i2')
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', st.shape, float(np.sqrt(np.mean(st ** 2))))
