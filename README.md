# Cinderdeep

A 3D online action RPG that runs in the browser, with its own multiplayer server.

Play it at https://cinderdeep.onrender.com.

The build number shows in the bottom right corner of the game, in Settings, and at /cinderdeep-server on the live site, so you can tell which version is running. Every new build starts a new season: heroes reset.

## How the live game gets updated

Each tested build is pushed to the `main` branch of this repository. Render sees the new commit and redeploys the site within a few minutes. If it does not, open the service on render.com and choose Manual Deploy, then Deploy latest commit.

## Run it on your own computer

1. Install Node.js (version 18 or newer) from nodejs.org.
2. In this folder, run: `node server.js`
3. Open http://localhost:3000 in a browser.

The server has no dependencies.

## How online play works

<<<<<<< Updated upstream
- On the menu, type a name and a party code, then press Play online. Everyone who types the same code plays together (up to 10). Leave the code blank for the public world.
- Monsters live on the server, so everyone sees and fights the same ones. Their life scales up with party size.
- Loot is personal. Shift-click an item in the bag (or tap it and choose Give) to hand it to the nearest player.
- Town (T) is private to each player for now. Taking the town portal returns you to your party.
=======
- On the menu, pick a hero and press Play. With the party code left blank you join other players automatically. Type a code to play with friends (up to 10 in a party), or tick Solo to play alone.
- In the game, the Parties button lists everyone playing; tap Join to move to their party. Leave party puts you on your own.
- Monsters live on the server, so everyone in a party fights the same ones. Their life scales with party size.
- Loot is personal: every player in a kill gets their own drops. Give an item to the nearest player from the bag.
- Town is private to each player. The town portal returns you to your party. The Rift Stone in town opens a timed floor for the whole party.
>>>>>>> Stashed changes
- Press Enter to chat.
- Heroes and the stash are saved in each player's own browser. The server keeps only the leaderboard.

## Files

- `server.js`: web server, WebSocket handling, parties, leaderboard.
- `sim/simsrv.js`: the monster simulation the server runs for each party.
- `public/`: the game itself. `public/js/data.js` and `public/js/game.js` are also loaded by the server, so the server and the players always use the same rules.
