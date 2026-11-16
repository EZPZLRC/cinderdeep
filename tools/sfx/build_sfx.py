#!/usr/bin/env python3
"""Build OathByte's recorded sound effects (public/sfx/*.mp3) from free CC0 packs.

Usage: python3 tools/sfx/build_sfx.py <folder of source files> public/sfx

The source folder holds the original pack files, renamed with a pack prefix:
  kr_  Kenney "RPG Audio"            ki_  Kenney "Impact Sounds"
  ks_  Kenney "Sci-Fi Sounds"         rd_  rubberduck "80 CC0 RPG SFX"
  ad_  artisticdude "RPG Sound Pack"   kd_  Kenney "Digital Audio"
  kf_  Kenney "Interface Sounds"      kj_  Kenney "Music Jingles"
Each file is trimmed of leading silence, cut to a maximum length with a short
fade, made mono 44.1 kHz, optionally brightened (high-shelf boost, low cut,
pitch raise: oathbyte-sfx-bright, Lee Nov 15 "brighter"), levelled to a common loudness and saved as 80 kbps MP3.
See public/sfx/CREDITS.txt for the packs, their pages and licences (all CC0).
"""
import os, re, subprocess, sys

# output name: (source file, max seconds or 0 for whole, extra gain dB[, options])
# options: b = high-shelf boost in dB above 3.5 kHz, r = pitch/speed factor, hp = low cut in Hz
B4 = {'b': 4, 'hp': 110}; B5 = {'b': 5, 'hp': 120}; B6 = {'b': 6, 'hp': 140}; HIT = {'b': 5, 'hp': 120, 'r': 1.08}
MAP = {
  # casting: blades / arrows, fire, cold, void (arc), lightning
  'cast_blade1': ('ad_swing.wav', 0, 0, B6), 'cast_blade2': ('ad_swing2.wav', 0, 0, B6), 'cast_blade3': ('ad_swing3.wav', 0, 0, B6),
  'cast_fire1': ('rd_spell_fire_07.ogg', .7, 2, B5), 'cast_fire2': ('rd_spell_fire_01.ogg', .8, 2, B5), 'cast_fire3': ('rd_spell_fire_06.ogg', .8, 2, B5),
  'cast_cold1': ('rd_spell_02.ogg', .55, 0, B5), 'cast_cold2': ('rd_spell_01.ogg', .6, 0, B5),
  'cast_arc1': ('ad_magic1.wav', .7, -2), 'cast_arc2': ('ks_force_field_001.ogg', .7, 0),
  'cast_zap1': ('ks_explosion_crunch_000.ogg', .5, 0),
  # hits and kills
  'hit_p1': ('ki_impact_punch_medium_000.ogg', .35, 0, HIT), 'hit_p2': ('ki_impact_punch_medium_001.ogg', .35, 0, HIT), 'hit_p3': ('ki_impact_punch_medium_003.ogg', .35, 0, HIT),
  'blade1': ('rd_blade_01.ogg', 0, 0, B6), 'blade2': ('rd_blade_02.ogg', 0, 0, B6), 'blade3': ('rd_blade_03.ogg', 0, 0, B6),
  'crit_m': ('ki_impact_metal_heavy_001.ogg', 0, 0, B5),
  'thud1': ('ki_impact_soft_heavy_000.ogg', .45, 0), 'thud2': ('ki_impact_soft_heavy_002.ogg', .45, 0),
  'death_big': ('rd_creature_die_01.ogg', 0, 0),
  'roar1': ('rd_creature_roar_01.ogg', 0, 0), 'roar2': ('rd_creature_roar_03.ogg', 0, 0),
  'wind_up': ('rd_creature_monster_04.ogg', 0, -2),
  'boom': ('ks_low_frequency_explosion_000.ogg', 1.6, 0),
  # player
  'hurt2': ('ki_impact_soft_medium_001.ogg', 0, 0), 'hurt3': ('ki_impact_soft_medium_003.ogg', 0, 0),
  'block1': ('rd_metal_02.ogg', .4, 0, B5), 'block2': ('rd_metal_03.ogg', .4, 0, B5), 'block3': ('ki_impact_metal_light_001.ogg', 0, 0, B5),
  'bottle': ('ad_bottle.wav', 0, 0), 'bubble': ('ad_bubble2.wav', 0, -2),
  'stone1': ('rd_stones_04.ogg', 0, 0), 'stone2': ('ki_impact_mining_000.ogg', .55, 0),
  'toll': ('ki_impact_bell_heavy_001.ogg', 0, 0),
  # footsteps by ground
  'st_grass1': ('ki_footstep_grass_000.ogg', .3, 0, B4), 'st_grass2': ('ki_footstep_grass_001.ogg', .3, 0, B4), 'st_grass3': ('ki_footstep_grass_002.ogg', .3, 0, B4),
  'st_dirt1': ('kr_footstep_0.ogg', .3, 0, B4), 'st_dirt2': ('kr_footstep_2.ogg', .3, 0, B4), 'st_dirt3': ('kr_footstep_4.ogg', .3, 0, B4),
  'st_stone1': ('ki_footstep_concrete_000.ogg', 0, 0, B4), 'st_stone2': ('ki_footstep_concrete_001.ogg', 0, 0, B4), 'st_stone3': ('ki_footstep_concrete_003.ogg', 0, 0, B4),
  'st_snow1': ('ki_footstep_snow_000.ogg', .3, 0, B4), 'st_snow2': ('ki_footstep_snow_002.ogg', .3, 0, B4),
  # loot, gold, items
  'cloth1': ('kr_cloth_2.ogg', 0, 0, B6), 'cloth2': ('kr_cloth_4.ogg', 0, 0, B6), 'cloth3': ('ad_cloth.wav', 0, 0, B6), 'leather': ('kr_handle_small_leather.ogg', 0, 0, B6),
  'coins1': ('rd_item_coins_01.ogg', 0, 0, B6), 'coins2': ('rd_item_coins_03.ogg', 0, 0, B6), 'coins3': ('kr_handle_coins_2.ogg', 0, 0, B6), 'coins_big': ('rd_item_coins_04.ogg', 0, 0, B6),
  'gem1': ('rd_item_gem_01.ogg', 0, 0, B6), 'gem3': ('rd_item_gem_03.ogg', 0, 0, B6), 'gem4': ('rd_item_gem_04.ogg', 0, 0, B6),
  'bell_hi': ('ki_impact_bell_heavy_002.ogg', 0, 0), 'bell_lo': ('ki_impact_bell_heavy_000.ogg', 0, 0), 'bell_sm': ('ki_impact_bell_heavy_003.ogg', 0, 0),
  # magic places: shrines, buffs, gates
  'shimmer': ('rd_spell_02.ogg', 0, 0, B6), 'swell': ('ks_force_field_002.ogg', 0, -2), 'warp_ff': ('ks_force_field_000.ogg', 0, -1),
  'gate_hum': ('ks_space_engine_low_000.ogg', 3.2, -3),
  # oathbyte-sfx-bright: bright, sparkly layers (Lee, Nov 15: "brighter", like Torchlight Infinite)
  'tick1': ('ki_impact_metal_light_000.ogg', .25, 0, {'b': 6, 'hp': 400, 'r': 1.3}), 'tick2': ('ki_impact_metal_light_002.ogg', .25, 0, {'b': 6, 'hp': 400, 'r': 1.3}), 'tick3': ('ki_impact_metal_light_004.ogg', .25, 0, {'b': 6, 'hp': 400, 'r': 1.3}),
  'glass1': ('ki_impact_glass_light_000.ogg', 0, 0, B6), 'glass2': ('ki_impact_glass_light_003.ogg', 0, 0, B6), 'shatter': ('ki_impact_glass_medium_001.ogg', 0, 0, B5),
  'zap1': ('kd_zap_1.ogg', .55, -1, B4), 'zap2': ('kd_zap_2.ogg', .55, -1, B4),
  'phase1': ('kd_phaser_up_3.ogg', 0, -2, {'b': 3, 'hp': 200}), 'phase2': ('kd_phaser_up_6.ogg', 0, -2, {'b': 3, 'hp': 200}),
  'chime1': ('kf_maximize_006.wav', 0, 0, B4), 'chime2': ('kf_confirmation_002.wav', 0, 0, B4), 'chime3': ('kf_glass_004.wav', 0, 0, B4), 'chime4': ('kf_confirmation_004.wav', 0, 0, B4),
  'pluck1': ('kf_pluck_001.wav', 0, 0, B4), 'pluck2': ('kf_pluck_002.wav', 0, 0, B4),
  'fanfare1': ('kj_jingles_steel_10.ogg', 0, 0, B4), 'fanfare2': ('kj_jingles_steel_2.ogg', 0, 0, B4),
}
TARGET_RMS = -19.0  # dBFS mean level after levelling
PEAK = -1.0

def vol(path, af=''):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', path, '-af', (af + ',' if af else '') + 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    mean = float(re.search(r'mean_volume: (-?[\d.]+)', r).group(1)); peak = float(re.search(r'max_volume: (-?[\d.]+)', r).group(1)); return mean, peak

def main(src, out):
    os.makedirs(out, exist_ok=True)
    for name, row in MAP.items():
        f, maxs, extra = row[:3]; o = row[3] if len(row) > 3 else {}
        p = os.path.join(src, f)
        chain = ['aformat=channel_layouts=mono', 'aresample=44100', 'silenceremove=start_periods=1:start_threshold=-50dB']
        if o.get('r'): chain += [f"asetrate={44100 * o['r']:.0f}", 'aresample=44100']
        if o.get('hp'): chain += [f"highpass=f={o['hp']}"]
        if o.get('b'): chain += [f"treble=g={o['b']}:f=3500"]
        if maxs: chain += [f'atrim=0:{maxs}', f'afade=t=out:st={max(0, maxs - .12):.3f}:d=0.12']
        else: chain += ['areverse', 'afade=t=in:d=0.01', 'areverse']
        af = ','.join(chain)
        mean, peak = vol(p, af)
        g = min(TARGET_RMS - mean, PEAK - peak) + extra
        g = min(g, PEAK - peak)
        dst = os.path.join(out, name + '.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', p, '-af', af + f',volume={g:.2f}dB', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '80k', '-map_metadata', '-1', dst], check=True)
        print(f'{name:12s} <- {f:36s} gain {g:+.1f} dB  {os.path.getsize(dst)} bytes')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
