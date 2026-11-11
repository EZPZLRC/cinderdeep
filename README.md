# Cinderdeep server

One small Node program that does two jobs:

1. Serves the game (the `public` folder) as a website.
2. Runs the shared world: monsters, bosses and parties for everyone connected.

It has no dependencies. Any host that can run Node 18 or newer will do.

## Run it on your own computer

1. Install Node.js (version 18 or newer) from nodejs.org.
2. In this folder, run: `node server.js`
3. Open http://localhost:3000 in a browser. Open it in a second window to see a second player.

## Put it online for free (Render)

1. Put this folder in a GitHub repository.
2. On render.com choose New > Web Service and pick that repository.
3. Settings: Language `Node`, Build command `npm install`, Start command `node server.js`, Instance type `Free`.
4. Render gives you a web address. Share that address; anyone who opens it can play.

On the free plan the server goes to sleep after 15 minutes with nobody playing, and takes about a minute to wake up for the first visitor.

## How online play works

- On the menu, type a name and a party code, then press Play online. Everyone who types the same code plays together (up to 8). Leave the code blank for the public world.
- Monsters live on the server, so everyone sees and fights the same ones. Their life scales up with party size.
- Loot is personal: each player gets their own drops. Shift-click an item in the bag (or tap it and choose Give) to hand it to the nearest player.
- Press Enter to chat.
- Heroes are saved in each player's own browser, one per class. The server stores nothing.

## Files

- `server.js`: web server, WebSocket handling, parties.
- `sim/simsrv.js`: the monster simulation the server runs for each party.
- `public/`: the game itself. `public/js/data.js` and `public/js/game.js` are also loaded by the server, so the server and the players always use the same rules.
