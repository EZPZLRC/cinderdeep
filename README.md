# Cinderdeep server (build 0013)

The build number shows in the bottom right corner of the game and at /cinderdeep-server on the live site, so you can tell which version is running.

One small Node program that does two jobs:

1. Serves the game (the `public` folder) as a website.
2. Runs the shared world: monsters, bosses and parties for everyone connected.

It has no dependencies. Any host that can run Node 18 or newer will do.

## Updating the live game

1. Unzip the new `cinderdeep-server.zip`.
2. On github.com/EZPZLRC/cinderdeep click Add file, then Upload files.
3. Drag in the five items from the unzipped folder (server.js, package.json, README.md, public, sim) and click Commit changes.
4. Render rebuilds the site in a few minutes. If it does not, open the service on render.com and choose Manual Deploy, then Deploy latest commit.

## Run it on your own computer

1. Install Node.js (version 18 or newer) from nodejs.org.
2. In this folder, run: `node server.js`
3. Open http://localhost:3000 in a browser.

## How online play works

- On the menu, type a name and a party code, then press Play online. Everyone who types the same code plays together (up to 8). Leave the code blank for the public world.
- Monsters live on the server, so everyone sees and fights the same ones. Their life scales up with party size.
- Loot is personal. Shift-click an item in the bag (or tap it and choose Give) to hand it to the nearest player.
- Town (T) is private to each player for now. Taking the town portal returns you to your party.
- Press Enter to chat.
- Heroes and the stash are saved in each player's own browser. The server stores nothing.

## Files

- `server.js`: web server, WebSocket handling, parties.
- `sim/simsrv.js`: the monster simulation the server runs for each party.
- `public/`: the game itself. `public/js/data.js` and `public/js/game.js` are also loaded by the server, so the server and the players always use the same rules.
