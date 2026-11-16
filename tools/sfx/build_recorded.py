# Build the in-game files for Lee's round-4 picks (Nov 16). Each pick is rendered with the exact chain the picker page used
# (same layers, levelling, room reverb, limiter and loudness gain), split into a swing/cast part and an impact part where the
# game plays them at different moments. Each file is peak-normalised to -1 dB and the game gets a volume that puts it back
# at the level Lee heard: vol = 1 / (g * 0.7), where g is the normalising gain and 0.7 is the game's master volume.
# Usage: python3 -I build_recorded.py SCRATCH_DIR OUT_DIR   (prints a JSON map name -> vol)
import sys, os, json, subprocess, numpy as np
SCR = sys.argv[1]; OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
SR = 44100; MASTER = .7
BASE = {'oc:': (SCR + '/dl3/facebookincubator_Meta-open-sound/corpora/oculus-audio-pack/ogg/', '.ogg'), 'ef:': (SCR + '/dl3/EternityForest_Free-SFX/', ''), 'src:': (SCR + '/src/', '')}
def path(f):
    for k, (b, e) in BASE.items():
        if f.startswith(k): return b + f[len(k):] + e
def dec(p, af='', ch=2):
    cmd = ['ffmpeg', '-v', 'error', '-nostdin', '-i', p] + (['-af', af] if af else []) + ['-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).astype(np.float64).reshape(-1, ch)
CACHE = {}
def load(f, mx, off):
    k = (f, mx, off)
    if k in CACHE: return CACHE[k]
    ch = []
    if off: ch += [f'atrim=start={off}', 'asetpts=PTS-STARTPTS']
    ch += ['silenceremove=start_periods=1:start_threshold=-55dB', 'highpass=f=35']
    if mx: ch += [f'atrim=0:{mx}', f'afade=t=out:st={max(0, mx - .1):.3f}:d=0.1']
    x = dec(path(f), ','.join(ch))
    a = np.abs(x).max(axis=1); act = x[a > a.max() * .05] if a.max() > 0 else x
    rms = np.sqrt(np.mean(act ** 2)) + 1e-9; pk = np.abs(x).max() + 1e-9
    x = x * min(10 ** (-18 / 20) / rms, 10 ** (-1 / 20) / pk); CACHE[k] = x; return x
rng = np.random.default_rng(7)
def make_ir(t60=.9, pre=.012):
    n = int(t60 * SR); t = np.arange(n) / SR; env = 10 ** (-3 * t / t60)
    ir = rng.standard_normal((n, 2)) * env[:, None]
    for c in range(2): ir[:, c] = np.convolve(ir[:, c], np.ones(6) / 6, 'same')
    ir = np.vstack([np.zeros((int(pre * SR), 2)), ir]); return ir / np.sqrt((ir ** 2).sum(axis=0))
IR = make_ir()
def conv(x, ir):
    n = len(x) + len(ir) - 1; N = 1 << (n - 1).bit_length()
    return np.stack([np.fft.irfft(np.fft.rfft(x[:, c], N) * np.fft.rfft(ir[:, c], N), N)[:n] for c in range(2)], 1)
def render(layers, rev, shift=0):
    buf = np.zeros((SR * 7, 2))
    for _, f, v, r, d, mx, off in layers:
        x = load(f, mx, off)
        if r != 1: idx = np.arange(0, len(x) - 1, r); x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
        i0 = int(max(0, d - shift) * SR); n = min(len(x), len(buf) - i0); buf[i0:i0 + n] += x[:n] * v * MASTER
    end = np.nonzero(np.abs(buf).max(1) > 1e-5)[0]; buf = buf[:end[-1] + 1] if len(end) else buf[:SR]
    wet = conv(buf, IR) * rev; out = np.zeros((len(wet), 2)); out[:len(buf)] += buf; out += wet
    lim = .5; a = np.abs(out); return np.where(a > lim, np.sign(out) * (lim + (a - lim) / 5), out)
def trimend(x):
    a = np.abs(x).max(1); idx = np.nonzero(a > 10 ** (-58 / 20))[0]; e = (idx[-1] if len(idx) else 0) + int(.06 * SR)
    x = x[:min(len(x), e)]; f = min(len(x), int(.04 * SR)); x[-f:] *= np.linspace(1, 0, f)[:, None]; return x
def S(f, v, r=1, d=0, mx=0, off=0): return ('s', f, v, r, d, mx, off)
OC = lambda n: 'oc:' + n
Q = lambda n: 'ef:qubodup/Swooshes/swosh-%02d.opus' % n
# name: (layers, reverb, picker gain, shift) -- picker gain is the loudness gain the page used for that option (moments.json)
J = {}
def part(name, layers, rev, s, shift=0): J[name] = (layers, rev, s, shift)
part('r_sword_sw', [S(OC('WEAPSwrd_Sword_OS_02'), .55)], .14, .911)
part('r_sword_hit', [S(OC('FGHTImpt_PunchHarder_OS_02'), .7, 1, .15), S(OC('WEAPSwrd_SwordScrape_OS_01'), .22, 1, .15, .25)], .14, .911, .15)
part('r_axe_sw', [S(OC('SWSH_Swoosh_OS_02'), .65)], .14, .817)
part('r_axe_hit', [S(OC('FGHTImpt_PunchHarder_OS_04'), .7, 1, .16), S(OC('GOREBone_BonesBreaking_OS_01'), .28, 1, .16, .35)], .14, .817, .16)
part('r_maul_sw', [S(Q(30), .6, 1, 0, .5)], .14, .723)
part('r_maul_hit', [S(OC('FGHTImpt_Kick_OS_05'), .8, 1, .3), S(OC('METLImpt_HammerAnvil_OS_01'), .35, .9, .3)], .14, .723, .3)
part('r_bow_sw', [S(Q(9), .55), S(OC('WHSH_WhooshMedium_OS_01'), .4, 1.1, .04)], .14, 1.0)
part('r_bow_hit', [S(OC('FGHTImpt_PunchRegular_OS_05'), .6, 1, .2), S('src:ki_impact_wood_light_002.ogg', .35, 1, .2)], .14, 1.0, .2)
part('r_bolt_sw', [S(OC('MAGSpel_MagicSpell_OS_01'), .5, 1.15, 0, .6)], .14, .955)
part('r_bolt_hit', [S(OC('FGHTImpt_PunchRegular_OS_01'), .45, 1, .25)], .14, .955, .25)
part('r_fire_sw', [S(Q(33), .55, 1, 0, .6), S('ef:PagDev/fire_loop.opus', .5, 1, 0, .7, 3)], .14, .69)
part('r_fire_hit', [S('ef:Thimras/cannon_fire.opus', .45, 1.1, .3, .8)], .14, .69, .3)
part('r_cold_sw', [S(OC('DSGNImpt_ImpactCreepyReverb_OS_03'), .32, 1.1, .1, 1)], .14, 1.128, .1)
part('r_cold_hit', [S(OC('GLASImpt_GlassBottleDrop_OS_01'), .3, 1, .1, .5), S(OC('GLASBrk_GlassBottleBreak_OS_01'), .35, .9, .15)], .14, 1.128, .1)
part('r_arc_sw', [S(OC('MAGSpel_MagicSpell_OS_02'), .6, 1, 0, 1.2)], .14, 1.0)
part('r_light_sw', [S('ef:Electricity/crackleelectricityloop.opus', .45, 1, 0, .35), S('ef:Electricity/teleport.opus', .4, 1, .05)], .14, 1.0)
part('r_light_hit', [S(OC('FGHTImpt_Kick_OS_04'), .45, 1, .1)], .14, 1.0, .1)
part('r_crit', [S(OC('GOREBone_BonesBreaking_OS_03'), .4, 1, 0, .45), S(OC('FGHTImpt_Kick_OS_04'), .75), S(OC('METLImpt_HammerAnvil_OS_01'), .28)], .14, 1.089)
part('r_kill', [S(OC('GORESqsh_BloodSquishSlimy_OS_01'), .4, 1.1, 0, .55), S(OC('FGHTImpt_PunchRegular_OS_06'), .6)], .14, 1.293)
part('r_bigkill', [S(OC('CREAHmn_GiantDeath_OS_02'), .55), S(OC('GOREBone_BonesBreaking_OS_02'), .35, 1, .05, .6), S('ef:Electricity/deathboom.opus', .32, 1, .1, 1.2)], .14, 1.0)
part('r_bossdie', [S(OC('CREAHmn_OgreDeathScream_OS_01'), .55, 1, 0, 1.5), S('ef:Thimras/cannon_fire.opus', .45, .8), S('ef:Superpowers/medieval-fantasy/victory-1.opus', .5, 1, 1.0)], .14, .977)
part('r_hurt', [S(OC('FGHTImpt_Kick_OS_01'), .65), S(OC('METLImpt_MetalHitSurface_OS_04'), .14, 1.1, 0, .2)], .14, .895)
part('r_drop1', [S(OC('METLImpt_MetalObjDrop_OS_01'), .35), S(OC('UIAlert_Notification_OS_01'), .4)], .14, 1.0)
part('r_drop2', [S(OC('UIAlert_MusicTone_OS_02'), .3, 1, 0, 1.2), S(OC('METLImpt_MetalObjDrop_OS_02'), .35), S(OC('UIMisc_BelltreeUp_OS_01'), .25, 1.2, 0, 1.2)], .14, 1.0)
part('r_drop3', [S('src:ki_impact_bell_heavy_002.ogg', .45, 1.2), S(OC('UIMisc_BelltreeUp_OS_01'), .4, 1, 0, 2), S(OC('METLImpt_MetalObjDrop_OS_04'), .35)], .14, 1.077)
part('r_drop4', [S(OC('MUSCStngr_VictoryOrchestral_OS_01'), .6), S('src:ki_impact_bell_heavy_000.ogg', .4, 1.2)], .14, 1.044)
part('r_pickup', [S(OC('OBJBag_KnapsackLeatherOpen_OS_01'), .5, 1.1, 0, .5)], .14, 2.174)
part('r_gold', [S(OC('OBJCoin_CoinsUI_LOOP_01'), .45, 1, 0, .55)], .14, .662)
part('r_level', [S(OC('MUSCStngr_LevelUpMallet_OS_01'), .6)], .14, 1.0)
part('r_ui', [S(OC('UIClick_MetalConfirm_OS_01'), .45, 1, 0, .35)], .05, 1.0)
for i in (1, 2, 3, 4):
    part('r_st_grass%d' % i, [S(OC('FEETHmn_ShoeGrassWalk_OS_0%d' % i), .55)], .06, .311)
    part('r_st_wood%d' % i, [S(OC('FEETHmn_ShoeWoodWalk_OS_0%d' % i), .55)], .22, .409)
vols = {}
for name, (L, rev, s, shift) in J.items():
    x = trimend(render(L, rev, shift)) * s
    g = 10 ** (-1 / 20) / (np.abs(x).max() + 1e-9); y = x * g
    br = '64k' if name.startswith('r_st_') or name == 'r_ui' else '96k'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', br, os.path.join(OUT, name + '.mp3')], input=y.astype(np.float32).tobytes(), check=True)
    vols[name] = round(1 / (g * MASTER), 3)
print(json.dumps(vols))
