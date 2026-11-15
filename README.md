# Cinderdeep

A 3D online action RPG that runs in the browser, with its own multiplayer server.

Play it at https://cinderdeep.onrender.com.

The build number shows in the bottom right corner of the game, in Settings, and at /cinderdeep-server on the live site, so you can tell which version is running. Heroes carry over from build to build.

## How the live game gets updated

Each tested build is pushed to the `main` branch of this repository. When more than one session is building at the same time, merge the latest `main` into your work before pushing: copying a whole game folder over `public/` throws away whatever was pushed in between. Render sees the new commit and redeploys the site within a few minutes. If it does not, open the service on render.com and choose Manual Deploy, then Deploy latest commit.

## Run it on your own computer

1. Install Node.js (version 18 or newer) from nodejs.org.
2. In this folder, run: `node server.js`
3. Open http://localhost:3000 in a browser.

The server has no dependencies.

## How online play works

- On the menu, pick a hero and press Play. With the party code left blank you join other players automatically. Type a code to play with friends (up to 10 in a party), or tick Solo to play alone.
- In the game, the Parties button lists everyone playing; tap Join to move to their party. Leave party puts you on your own.
- AI teammates: when your party has room, up to three AI heroes fight beside you (a party of four). One steps aside for each real player who joins, and they come back when players leave. The party leader runs them and everyone in the party sees them. Turn them off in Settings.
- Real danger: monsters hit harder on every floor you go down (floor 4 hits about four and a half times as hard as floor 1, and it keeps climbing a little deeper). Champions wind up a heavy blow shown as a red circle on the ground, the screen pulses red below 30% life, and the first time you reach floors 2 and 4 a hint explains what to do. Hits to kill, drops and XP are unchanged.
- Item size: bag and shop items are bigger by default. Settings has Item size (Normal, Large or Extra large); on phones the bag widens to fit the larger items.
- Real materials (build 0036): hero cloth, leather, steel, skin and hair each get their own surface in the renderer (weave and folds, grain and wear, brushed and scratched steel with reflections, soft skin light, hair strands). Medium and High graphics only; Low draws heroes as before.
- Smoother bodies (build 0037): heroes use sculpted lofted shapes for torso, arms, legs and head instead of stacked spheres and tapers. Invite links carry the inviter's name, show a banner on the menu and drop the friend into that party on Play. Leaderboard badges show how each is earned on hover or tap.
- Real hero models (build 0039): the Ranger is a skinned, animated 3D character from the free CC0 Quaternius packs (Universal Base Characters, Modular Character Outfits Fantasy, Universal Animation Library). `tools/model/build.mjs` bakes glTF into a compact `.cdm` file (shared vertices, a colour per vertex, animations as bone matrices), and the game animates it on the graphics card. If a model can't load, the code-built hero is drawn instead. Build 0040: with `?models=1` a line at the bottom left says whether the model loaded and, if not, why (shader, download, graphics card error or hero code).
- Build 0042: every hero, the townsfolk and the merchant use real models. `tools/model/characters.sh <packs folder> <UAL1_Standard.glb>` bakes `public/models/anims.cdl` (one shared animation library, retargeted on the graphics card side by forward kinematics in `models.js`) and mesh-only `.cdm` files for ranger, warden, arcanist, elementalist, brawler, folkm and folkf. Class colours are dyed at bake time with `--tint`; townsfolk are dyed at runtime from their LOOK colours. Helmets, hats, shields and weapons are still code-built and ride on the hand, head and back bones. Still behind `?models=1`.
- Build 0043: real models are the default for everyone. `?models=0` forces the classic code-built characters, and `?models=1` shows the load-check line. Any device that cannot load a model, or hits an error drawing one, falls back to the classic look on its own.
- Build 0044: new floors. The ground shader (material 1 in `gl.js`) blends four layers, the region colour, earth, stone and ash, by height with warped, rotated noise so nothing tiles. Each region sets `gr: [earth, stone, ash, glow]` in THEMES; stone gets flagstones with mortar on Medium and High, and the glow colour is the region lamp colour. Low graphics skips the warp and the flagstones.
- Build 0069: story Act II, The Burning. Slay Magmaw and the Ashen Tyrant, ask Lysa about the missing scholar, free Maren from the ice on floor 6 or deeper, slay the Pale Matriarch, then report to Captain Roek. Heroes already past those floors get a recap.
- Build 0068: story campaign Act I, The Blight: story scenes, act titles, story goals in the quest box, townsfolk story talks, Vaeloth's brand under story guardians, a recap for heroes already past it.
- Build 0067: the corner portrait is a close-up render of the real hero model instead of a painted cartoon.
- Build 0066: hero skill animations with weight: a real jump for Leap, a sprint for Charge, a guard stance, spell wind-ups and full-body swings when standing.
- Build 0065: region death effects (bone dust, rot spores, glowing ash, shatter, void implode), soul wisps, lingering remains
- Build 0064: directional hit sprays, floor splashes, crit star flares, fire embers and ice shards on hit
- Build 0063: loot tossed in an arc with a landing flash, richer beams and rune circles, coin heaps, waystone gate back up
- Build 0062: playtest fixes: tougher guardians, honest upgrade arrows, trees fade, softer spell flashes, floors kept across updates, back-a-floor gate
- Build 0061: ice walls in frosted stone with faceted crystal shard clusters and softer snow caps.
- Build 0060: lava walls in basalt with magma-lit joints, void walls in polished obsidian with violet veins.
- Build 0059: fixes the game failing to start on build 0058 (a broken news line).
- Build 0058: guardians (bosses) now use real animated models: plate knights with horned helms and greatswords, and hooded casters over a tattered shroud.
- Build 0057: element spell effects: flame bolts with embers and smoke, spinning ice shards that leave ice spikes, crackling lightning orbs, arcane motes; element impacts; monster shots get a core and trail.
- Build 0056: crypt walls, columns and tombs drawn as coursed stone masonry (mortar joints, bevels, cracks, grime, moss) with dark rough cap stones on top.
- Build 0055: monsters on real models: hunched risen dead, hulking brutes and hooded cultists with glowing eyes and real animations (free CC0 Quaternius base body, outfits and animation library).
- Build 0054: teammate roles. aiPick gives a tank (warden, or brawler if you are one), a healer (arcanist, or elementalist) then a damage dealer; A.role. aiTaunt every 5 s sets e.tnt on non-boss monsters within 7 m (solo only), updEnemy then aims at T = the tank and its hits go to tankHit. aiMend heals 14% below 70% life (22% below 40%). hitEnemy caps ally damage at 12% life left, and ally fire leaves no burn, so the hero lands the kill.
- Build 0053: boss moments. G.cine {kind intro|death, t, dur, x, z} in update(): intro once per floor (G.cineKey) when the boss wakes, death when G.boss stops being alive; solo play scales dt (intro .3, death eases from .15 back to 1), online only the camera moves. drawWorld pulls the camera toward the boss and zooms in; body.cine shows letterbox bars; boss bar gains a damage trail, quarter ticks and a percent; SFX 'bossdie'.
- Build 0052: lighting. Themes with torchSh (crypt, void) switch the shadow map to a perspective light 5.2 above the hero's torch (env.pt/ptc/ptr in gl.js, uTP/uTC/uTR in FS) so shadows radiate from the hero, the moon fills in unshadowed; analytic in-scattering along the view ray for the 8 nearest lights and the torch (uScat, from zone mist); wall torches emit light; fireFl() flicker for the hero torch, lamps and torches.
- Build 0051: recorded sound effects from Kenney's CC0 packs (public/sfx, loaded on first input, synth fallback) for hits, crits, kills, elite and boss kills, hurt, dashes, slams, coins and hero footsteps; fight music "Battle Theme A" by cynicmusic (CC0, public/sfx/battle.mp3) fades in over the area tune when awake foes are near, its filter opening as the fight grows and fully for bosses (fightHeat in game.js).
- Build 0050: hit weight. hitEnemy sets a flinch (hf, drawn with tiltBase), a sliding shove (kvx/kvz), and staggers wind-ups on heavy hits or crits (cancels the monster's marked attack); killEnemy flings corpses (flingCorpse/flyStep). Cone markers drawn without seams.
- Build 0049: fixes the "col is not defined" error from the 0048 ground markers (drawTele now uses GLX.col).
- Build 0048: telegraphed heavy blows in circle, cone, line, cross and ray shapes (inArea, eTele, bossTele, drawTele in game.js); a heavy blow takes at least a set share of life that grows with depth; phone dodge button; online play sends the shapes too.
- Build 0047: high-res icons for every skill and menu button from game-icons.net by Lorc, Delapouite and contributors (CC BY 3.0, credited in Settings), built into public/js/icons.js by tools/ui/make_icons.mjs from tools/ui/icon_picks.json; forged button frames; badges shown only in the Badges window.
- Build 0046: the town and forest use real models from the free CC0 Quaternius packs (Medieval Village MegaKit, Fantasy Props MegaKit, Stylized Nature MegaKit). `tools/model/env_recipe.mjs` writes the recipe (houses are assembled from wall, roof and window pieces), `tools/model/env.mjs` bakes `public/env/world.cde` (quantized meshes), and `tools/model/env_tex.py` packs the textures into `public/env/tex.jpg` and `alpha.png`. The renderer draws them through its own textured mesh shader and keeps the old code-built scenery if the pack cannot load (`?scenery=0` forces it). The floor portal is a Gothic stone arch you can click or tap to travel, and Salvage all takes every unlocked item.
- Gear shapes (build 0038): layered pauldron lames, chainmail skirt (its own ring material on Medium and High) with swinging tassets, leather flaps on leather chests, draped cowl hoods, glowing rune glyphs on rare and better chests, pauldrons, swords and axes, and a soft glow with rising embers around heroes wearing legendaries.
- Scarcer loot and town tools (build 0045): plain monsters drop about half as much (mostly fewer grey and blue items), a legendary comes about every two and a half floors, and an item is guaranteed after 20 kills without one. A brand-new hero always starts on floor 1: an empty party's floor is only handed back to the same hero. Town has a Training Dummy that shows damage per second. The Badges button (on phones: Leaders, then See all badges) lists every badge; click one to see how it is earned. Bag and Trader items carry a green arrow when they are better overall and a red one when they are not. Treasure Goblins glow on the minimap with a gold arrow pointing to them. A guardian's loot lands away from the gate it opens. Each area has its own song that keeps changing, the bottom bar has a 3D look and the XP bar fills smoothly.
- Monsters live on the server, so everyone in a party fights the same ones. Their life scales with party size.
- Loot is personal: every player in a kill gets their own drops. Give an item to the nearest player from the bag.
- Town is private to each player. The town portal returns you to your party. The Rift Stone in town opens a timed floor for the whole party.
- Press Enter to chat.
- Heroes and the stash are saved in each player's own browser. The server keeps only the leaderboard.

## Files

- `server.js`: web server, WebSocket handling, parties, leaderboard.
- `sim/simsrv.js`: the monster simulation the server runs for each party.
- `public/`: the game itself. `public/js/data.js` and `public/js/game.js` are also loaded by the server, so the server and the players always use the same rules.
