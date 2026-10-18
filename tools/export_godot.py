#!/usr/bin/env python3
"""Export Aetherfall's baked art, room layouts, text and synthesized sound effects
from the Phaser build into files the Godot 4 project loads.

usage: python3 tools/export_godot.py   (after game/build.sh)
"""
import base64, json, os, re, shutil, struct, subprocess, sys, wave
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'game')
OUT = os.path.join(ROOT, 'godot')
TEX = os.path.join(OUT, 'assets', 'tex')
for d in [TEX, os.path.join(OUT, 'assets', 'bosses'), os.path.join(OUT, 'assets', 'sfx'),
          os.path.join(OUT, 'assets', 'music'), os.path.join(OUT, 'assets', 'fonts'), os.path.join(OUT, 'data')]:
    os.makedirs(d, exist_ok=True)


def save_url(path, url):
    head, b64 = url.split(',', 1)
    with open(path, 'wb') as f:
        f.write(base64.b64decode(b64))


JS_COMMON = r"""
() => {
  const out = {tex: {}, meta: {}};
  const skip = k => /^__/.test(k) || /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(k) || k === 'dino' || k.startsWith('bs_') || k.startsWith('sky_');
  const url = src => { if (src instanceof HTMLCanvasElement) return src.toDataURL('image/png');
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c.toDataURL('image/png'); };
  const themeKeys = new Set(); for (const t in TKEYS) for (const k of TKEYS[t]) themeKeys.add(k);
  for (const k of TX.getTextureKeys()) { if (skip(k) || themeKeys.has(k)) continue; out.tex[k] = url(TX.get(k).getSourceImage()); }
  const rb = {}; for (const k in RB) rb[k] = [RB[k].px, RB[k].py, RB[k].c.width, RB[k].c.height];
  out.meta.rb = rb;
  return out;
}
"""

JS_THEME = r"""
(a) => {
  const out = {tex: {}, meta: {}};
  const url = src => { if (src instanceof HTMLCanvasElement) return src.toDataURL('image/png');
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c.toDataURL('image/png'); };
  const L = LV[a], t = L.theme;
  const T = themeTex(a);
  const oW = W; W = 2560; const sk = skyTex(a); W = oW;
  out.tex['sky_' + t] = url(TX.get(sk).getSourceImage());
  const mach = {};
  for (const k of new Set(PROPK[t])) for (const v of [0, 1]) { const m = getMach(t, k, v); mach[k + v] = {w: m.w, h: m.h, em: m.em}; }
  for (const k of TKEYS[t] || []) if (TX.exists(k) && !k.startsWith('sky_')) out.tex[k] = url(TX.get(k).getSourceImage());
  out.meta = {theme: t, farTop: T.farTop || 0, midTop: T.midTop || 0,
    walls: T.walls.map(b => ({w: b.w, h: b.h, em: b.em, fans: b.fans})), mach};
  return out;
}
"""

JS_BOSSES = r"""
() => {
  const out = {};
  for (const key of ['krell','bulwark','hound','crucible','seraph','malakar','sable','claude']) {
    const b = bakeBoss(key), n = b.frames.length, cols = Math.min(n, 4), rows = Math.ceil(n / cols);
    const c = document.createElement('canvas'); c.width = cols * b.fw; c.height = rows * b.fh; const g = c.getContext('2d');
    b.frames.forEach((f, i) => g.drawImage(f, (i % cols) * b.fw, Math.floor(i / cols) * b.fh));
    out[key] = {url: c.toDataURL('image/png'), fw: b.fw, fh: b.fh, ay: b.ay, px: b.px, names: b.names, cols};
  }
  return out;
}
"""

JS_DATA = r"""
() => {
  const rooms = {};
  for (const id in ROOMS) { const o = genRoom(ROOMS[id]);
    const cageIdx = c => o.cages.indexOf(c);
    rooms[id] = {id: o.id, a: o.a, k: o.k, gx: o.gx, gy: o.gy, w: o.w, h: o.h, kind: o.kind, doors: o.doors,
      RW: o.RW, RH: o.RH, FY: o.FY, solids: o.solids, plats: o.plats, zones: o.zones,
      gates: o.gates.map(g => ({kind: g.kind, x: g.x, w: g.w, top: g.top, bot: g.bot == null ? null : g.bot, hp: g.hp == null ? null : g.hp, plate: g.plate == null ? null : g.plate})),
      cages: o.cages.map(c => ({x: c.x, kind: c.kind})),
      items: o.items.map(it => ({type: it.type, id: it.id, x: it.x, y: it.y, cage: it.cage ? cageIdx(it.cage) : -1})),
      crates: o.crates, coins: o.coins, spawns: o.spawns, props: o.props, lamps: o.lamps, vents: o.vents.map(v => ({x: v.x, t: v.t, fy: v.fy})),
      waves: o.waves, station: o.station ? {x: o.station.x} : null, shrine: o.shrine ? {x: o.shrine.x, ab: o.shrine.ab} : null,
      lift: o.lift ? {x: o.lift.x, dir: o.lift.dir, to: o.lift.to} : null};
  }
  const text = {LV, STORY, LORE, ABIL, GATEHINT, PICK, TANKS, GUARD, ETYPES, NPC_TALK, NPC_GIFT, NPC_IDLE, BOSS_TALK, WHO, RELICS, ARMS,
    SABLE_BIO, SLINE, PAL, AMB, MOTE, KINDS, FGK, TOPK, PROPK, CW, GY, H, RUSH};
  return {rooms, text};
}
"""

# every synthesized sound we need as a file: name -> JS that plays it once
SFX = {
    'jump1': 'sfxJump(1)', 'jump2': 'sfxJump(2)', 'land': 'sfxLand(1300)', 'land_big': 'sfxLand(2400)',
    'swing1': 'sfxSwing(1)', 'swing3': 'sfxSwing(3)', 'hit': 'sfxHit(14,null)', 'hit_big': 'sfxHit(34,null)',
    'edie': "sfxEnemyDie({x:null})", 'edie_big': "sfxEnemyDie({heavy:1})", 'edie_fly': "sfxEnemyDie({fly:1})",
    'hurt': 'sfxHurt(10)', 'pdown': 'sfxPlayerDown()', 'revive': 'sfxRevive()', 'dash': 'sfxDash()', 'roar': 'sfxRoar()',
    'slam0': 'sfxSlamStart()', 'slam': 'sfxSlam()', 'block': 'sfxBlock()', 'deflect': 'sfxDeflect()', 'fizz': 'sfxFizz()',
    'pick_coin': "sfxPick('coin')", 'pick_fruit': "sfxPick('fruit')", 'pick_med': "sfxPick('med')", 'pick_shard': "sfxPick('shard')",
    'pick_shield': "sfxPick('shield')", 'pick_fang': "sfxPick('fang')", 'pick_egg': "sfxPick('egg')", 'pick_tank': "sfxPick('tank')",
    'pick_misc': "sfxPick('x')", 'item': 'sfxItemGet()', 'crate0': 'sfxCrate(0)', 'crate1': 'sfxCrate(1)',
    'en_shot': "sfxEnemy('shot',{type:'d'})", 'en_shot_c': "sfxEnemy('shot',{type:'c'})", 'en_leap': "sfxEnemy('leap')",
    'en_smash': "sfxEnemy('smash')", 'en_swipe': "sfxEnemy('swipe')", 'en_spawn': "sfxEnemy('spawn')", 'en_lock': "sfxEnemy('lock')",
    'en_elite': "sfxEnemy('elite')", 'door': 'sfxDoor()', 'lift_up': 'sfxLift(-1)', 'lift_down': 'sfxLift(1)', 'alarm': 'sfxAlarm()',
    'clear': 'sfxClear()', 'gate': 'sfxGateBreak()', 'save': 'sfxSave()', 'vent': 'sfxVent(null)', 'thunder': 'sfxThunder()',
    'broar': 'sfxBossRoar()', 'bdie': 'sfxBossDie()', 'gameover': 'sfxGameOver()', 'ui1': 'sfxUI(1)', 'ui0': 'sfxUI(0)',
    'pause1': 'sfxPause(1)', 'pause0': 'sfxPause(0)', 'bshot': 'S.shot()', 'boom': 'S.boom()', 'warn': 'S.warn()',
    'weapon': "smp('weapon_change',{v:.5})",
}

JS_SFX_SETUP = r"""
async () => {
  /* decode the recorded one-shots once; AudioBuffers can be reused by any context */
  const dec = new OfflineAudioContext(2, 44100, 44100); window.__SMP = {};
  for (const k in SFXB) { const b = atob(SFXB[k]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    try { window.__SMP[k] = await dec.decodeAudioData(u.buffer); } catch (e) {} }
  ok = (k, gap) => { AU.vm = VMUL[k] || 1; return true; };
  smp = (k, o) => { if (!AU || !AU.smp[k]) return false; o = o || {}; const s = AC.createBufferSource(); s.buffer = AU.smp[k]; s.playbackRate.value = o.rate || 1;
    const g = AC.createGain(); g.gain.value = (o.v == null ? .5 : o.v); s.connect(g); g.connect(AU.sfx); s.start(AC.currentTime + .003); return true; };
  window.__render = async (code, dur) => {
    const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr); AC = ctx;
    const master = ctx.createGain(), comp = ctx.createDynamicsCompressor(); master.gain.value = .85;
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2; master.connect(comp); comp.connect(ctx.destination);
    const rev = ctx.createConvolver(); rev.buffer = impulse(1.8, 3.2); const revG = ctx.createGain(); revG.gain.value = .3; rev.connect(revG); revG.connect(master);
    const sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master); const sSend = ctx.createGain(); sSend.gain.value = .35; sfx.connect(sSend); sSend.connect(rev);
    const mus = ctx.createGain(); mus.connect(master); mus.gain.value = 0;
    const len = sr * 2, nb = ctx.createBuffer(1, len, sr), d = nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU = {master, comp, rev, revG, mus, sfx, echo: ctx.createGain(), noise: nb, duck: 1, cd: {}, vt: [], cur: null, smp: window.__SMP, amb: null};
    eval(code);
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), Rr = buf.getChannelData(1), n = L.length;
    let end = n - 1; while (end > 0 && Math.abs(L[end]) < 0.0015 && Math.abs(Rr[end]) < 0.0015) end--;
    end = Math.min(n, end + Math.floor(sr * 0.03));
    const pcm = new Int16Array(end * 2);
    for (let i = 0; i < end; i++) { const f = i > end - 400 ? (end - i) / 400 : 1;
      pcm[i * 2] = Math.max(-32767, Math.min(32767, L[i] * f * 32767)); pcm[i * 2 + 1] = Math.max(-32767, Math.min(32767, Rr[i] * f * 32767)); }
    let s = ''; const u8 = new Uint8Array(pcm.buffer); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    return btoa(s);
  };
  return Object.keys(window.__SMP);
}
"""


def html_to_bb(s):
    """the story text is small HTML; turn it into Godot RichTextLabel BBCode"""
    if not isinstance(s, str):
        return s
    s = s.replace('\n', ' ')
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'<span class="who" style="color:(#[0-9a-fA-F]+)">(.*?)</span>', r'[color=\1][b]\2[/b][/color]', s)
    s = re.sub(r'<span class="who">(.*?)</span>', r'[color=#b48cff][b]\1[/b][/color]', s)
    s = re.sub(r'<b style="color:(#[0-9a-fA-F]+)">(.*?)</b>', r'[color=\1][b]\2[/b][/color]', s)
    s = re.sub(r'<h3[^>]*>(.*?)</h3>', r'[color=#ffe08a][b]\1[/b][/color]\n', s)
    s = s.replace('<b>', '[b]').replace('</b>', '[/b]').replace('<i>', '[i]').replace('</i>', '[/i]')
    s = re.sub(r'\s*<p>\s*', '', s)
    s = re.sub(r'\s*</p>\s*', '\n\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    return s.strip()


def walk(o):
    if isinstance(o, dict):
        return {k: walk(v) for k, v in o.items()}
    if isinstance(o, list):
        return [walk(v) for v in o]
    return html_to_bb(o) if isinstance(o, str) and ('<' in o) else o


def main():
    page_url = 'file://' + os.path.join(GAME, 'aetherfall.html')
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        pg.goto(page_url)
        pg.wait_for_function('typeof TX!=="undefined" && TX && G.state==="menu" && typeof ROOM!=="undefined" && ROOM', timeout=60000)
        pg.wait_for_timeout(500)
        # world textures (all six themes), then the common set
        meta = {'themes': {}}
        for a in range(6):
            r = pg.evaluate(JS_THEME, a)
            for k, u in r['tex'].items():
                save_url(os.path.join(TEX, k + '.png'), u)
            meta['themes'][r['meta']['theme']] = r['meta']
            print('theme', r['meta']['theme'], len(r['tex']))
        r = pg.evaluate(JS_COMMON)
        for k, u in r['tex'].items():
            save_url(os.path.join(TEX, k + '.png'), u)
        meta['rb'] = r['meta']['rb']
        print('common', len(r['tex']))
        json.dump(meta, open(os.path.join(TEX, 'meta.json'), 'w'), separators=(',', ':'))
        # boss sheets
        bs = pg.evaluate(JS_BOSSES)
        bmeta = {}
        for k, v in bs.items():
            save_url(os.path.join(OUT, 'assets', 'bosses', k + '.png'), v.pop('url'))
            bmeta[k] = v
        json.dump(bmeta, open(os.path.join(OUT, 'assets', 'bosses', 'bosses.json'), 'w'), separators=(',', ':'))
        print('bosses', list(bmeta))
        # rooms and text
        d = pg.evaluate(JS_DATA)
        json.dump(d['rooms'], open(os.path.join(OUT, 'data', 'rooms.json'), 'w'), separators=(',', ':'))
        json.dump(walk(d['text']), open(os.path.join(OUT, 'data', 'text.json'), 'w'), indent=1, ensure_ascii=False)
        print('rooms', len(d['rooms']))
        # sound effects, rendered offline through the same synth graph
        pg.evaluate(JS_SFX_SETUP)
        for name, code in SFX.items():
            dur = 4.5 if name in ('bdie', 'thunder', 'item', 'gameover') else 2.6
            b64 = pg.evaluate('([c,d])=>__render(c,d)', [code, dur])
            raw = base64.b64decode(b64)
            tmp = os.path.join(OUT, 'assets', 'sfx', name + '.wav')
            with wave.open(tmp, 'wb') as w:
                w.setnchannels(2); w.setsampwidth(2); w.setframerate(44100); w.writeframes(raw)
            ogg = tmp[:-4] + '.ogg'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '5', ogg], check=True)
            os.remove(tmp)
        print('sfx', len(SFX))
        b.close()
    # dino sheet, music, fonts
    shutil.copy(os.path.join(GAME, 'sprites', 'dino.webp'), os.path.join(OUT, 'assets', 'dino.webp'))
    shutil.copy(os.path.join(GAME, 'sprites', 'dino.json'), os.path.join(OUT, 'assets', 'dino.json'))
    mus = os.path.join(ROOT, 'app', 'src', 'main', 'assets', 'music')
    for f in os.listdir(mus):
        dst = os.path.join(OUT, 'assets', 'music', f)
        if f.endswith('.ogg'):   # the web build streams Opus; Godot plays Ogg Vorbis
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(mus, f), '-c:a', 'libvorbis', '-q:a', '2', '-ar', '44100', dst], check=True)
        else:
            shutil.copy(os.path.join(mus, f), dst)
    from fontTools.ttLib import TTFont
    for f in os.listdir(os.path.join(GAME, 'fonts')):
        src = os.path.join(GAME, 'fonts', f)
        if f.endswith('.woff2'):
            ft = TTFont(src); ft.flavor = None
            ft.save(os.path.join(OUT, 'assets', 'fonts', f.replace('.woff2', '.ttf')))
        else:
            shutil.copy(src, os.path.join(OUT, 'assets', 'fonts', f))
    print('done')


if __name__ == '__main__':
    main()
