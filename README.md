# Cinderdeep

A 3D online action RPG that runs in the browser, with its own multiplayer server.

Play it at https://cinderdeep.onrender.com.

The build number shows in the bottom right corner of the game, in Settings, and at /cinderdeep-server on the live site, so you can tell which version is running. Heroes carry over from build to build.

## How the live game gets updated

Each tested build is pushed to the `main` branch of this repository. Render sees the new commit and redeploys the site within a few minutes. If it does not, open the service on render.com and choose Manual Deploy, then Deploy latest commit.

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
- Monsters live on the server, so everyone in a party fights the same ones. Their life scales with party size.
- Loot is personal: every player in a kill gets their own drops. Give an item to the nearest player from the bag.
- Town is private to each player. The town portal returns you to your party. The Rift Stone in town opens a timed floor for the whole party.
- Press Enter to chat.
- Heroes and the stash are saved in each player's own browser. The server keeps only the leaderboard.

## Files

- `server.js`: web server, WebSocket handling, parties, leaderboard.
- `sim/simsrv.js`: the monster simulation the server runs for each party.
- `public/`: the game itself. `public/js/data.js` and `public/js/game.js` are also loaded by the server, so the server and the players always use the same rules.
