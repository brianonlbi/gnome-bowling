# Gnome Bowling 2.0 (3D)

The same game as 1.0 — position, aim, power, ten frames, gnome antics, the turkey
dinner — rebuilt in real-time 3D with a proper physics engine.

Play it at **https://brianonlbi.github.io/gnome-bowling/v2/** (1.0 is still at the
address without `/v2/`).

## What's different from 1.0

- **Real physics.** Each gnome is a solid object that topples, spins and knocks into
  its neighbours. A gnome counts as down when it has tipped over or left the deck;
  one that only slides stays standing where it stopped.
- **A moving camera.** It follows the ball down the lane, sits by the pins for the
  crash, then shows the reindeer holding up the score.
- **Gnome Cam.** Whenever gnomes start an antic, a close-up window pops up so you
  can see what they are doing.
- **A scene with depth.** Snow falling through the view, shadows, a glossy ice lane,
  glowing lamps and string lights, a workshop, a Christmas tree, mountains, aurora.
- **Adapts to the device.** It fills any window shape, and steps its detail down by
  itself (sharpness first, then shadows) if the frame rate is poor.

Everything is still built in code: there are no model, image or sound files. The
characters are assembled from simple shapes and posed like jointed toys.

## Files

| File | What it is |
|---|---|
| `index.html`, `game.js` | The game. `game.js` is the built bundle (about 5 MB, 1.9 MB compressed). |
| `manifest.webmanifest`, `sw.js`, `icons/` | Install-with-icon and offline support. |
| `src/main.js` | Game flow, camera, antics, celebrations, input. |
| `src/physics.js` | Lane, pins and ball (Rapier). Tuning numbers are in `TUNE` and `C`. |
| `src/characters.js` | Gnomes, Santa, Mrs. Claus, reindeer, critters, props. |
| `src/world.js` | Sky, snow, lane, workshop, trees, lights. |
| `src/hud.js` | Scoreboard, power bar, menus, speech bubbles. |
| `src/audio.js` | Synthesized sound (same as 1.0). |

It also runs by double-clicking `index.html`, as long as `game.js` is beside it.

## Changing it

Needs Node.js. From this folder:

```
npm install
npm run build        # rebuilds game.js
node tune.mjs        # prints strike rates for the current pin physics
```

`tune.mjs` accepts overrides, for example `node tune.mjs pinMass=2 baseR=0.085`.
Heavier pins or a wider base (`baseR`) make strikes harder.

After changing files that are cached for offline play, bump `CACHE` in `sw.js`.

## Libraries

[three.js](https://threejs.org) (MIT) for rendering and
[Rapier](https://rapier.rs) (Apache-2.0) for physics, both bundled into `game.js`.
