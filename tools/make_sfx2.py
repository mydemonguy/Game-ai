#!/usr/bin/env python3
"""Synthesize the newer sound effects (capsule elevator, Overcharged robots, trials).
usage: make_sfx2.py <godot project dir>   (needs numpy and ffmpeg)"""
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
OUT = os.path.join(sys.argv[1], 'assets', 'sfx')

def env(n, a=.01, r=.2):
    e = np.ones(n)
    ai, ri = int(a * SR), int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e

def tone(freq, dur, kind='sine'):
    t = np.arange(int(dur * SR)) / SR
    f = freq if np.ndim(freq) else np.full_like(t, freq)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == 'sine':
        return np.sin(ph)
    if kind == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if kind == 'saw':
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    raise ValueError(kind)

def lowpass(x, k):
    ks = np.broadcast_to(np.asarray(k, float), x.shape)
    y = np.zeros_like(x); a = 0.0
    for i, v in enumerate(x):
        a += ks[i] * (v - a); y[i] = a
    return y

def noise(dur, seed=1):
    return np.random.default_rng(seed).uniform(-1, 1, int(dur * SR))

def save(name, x, gain=.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', os.path.join(OUT, name + '.ogg')], check=True)
    os.unlink(tmp)
    print(name, round(len(x) / SR, 2), 's')

# capsule charging: a hum that rises and speeds up its pulse over 1.1 s
d = 1.15
t = np.arange(int(d * SR)) / SR
f = 90 + 260 * (t / d) ** 1.6
hum = tone(f, d, 'saw') * .35 + tone(f * 2, d, 'tri') * .3 + tone(f * 3.01, d, 'sine') * .15
puls = .6 + .4 * np.sin(2 * np.pi * np.cumsum(4 + 22 * (t / d) ** 2) / SR)
x = lowpass(hum * puls, .18) * env(len(t), .25, .08)
save('lift_charge', x, .6)

# capsule arriving: soft two-note chime over a hiss of released air
d = .9
ch = (tone(880, d) * env(int(d * SR), .005, .7) + .7 * np.concatenate([np.zeros(int(.09 * SR)), tone(1318.5, d - .09) * env(int((d - .09) * SR), .005, .6)]))
air = lowpass(noise(d, 3), .25) * env(int(d * SR), .02, .8) * .35
save('lift_arrive', ch * .6 + air, .55)

# Overcharged robot destroyed: bright rising arpeggio sparkle
notes = [987.8, 1318.5, 1568.0, 1975.5]
x = np.zeros(int(.7 * SR))
for i, n in enumerate(notes):
    s0 = int(i * .06 * SR)
    seg = (tone(n, .45, 'tri') * .6 + tone(n * 2, .45) * .25) * env(int(.45 * SR), .003, .4)
    x[s0:s0 + len(seg)] += seg
save('oc_die', x, .55)

# trial begins: low horn swell with a metallic shimmer
d = 1.3
t = np.arange(int(d * SR)) / SR
horn = tone(73.4 * (1 + .01 * np.sin(2 * np.pi * 5 * t)), d, 'saw') * .5 + tone(110, d, 'saw') * .35 + tone(146.8, d, 'tri') * .25
x = lowpass(horn, .06 + .1 * (t / d)) * env(len(t), .35, .5)
x += lowpass(noise(d, 7), .5) * env(len(t), .6, .5) * .06
save('trial', x, .7)
