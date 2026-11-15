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
