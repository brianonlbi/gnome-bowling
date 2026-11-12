# Gnome Bowling

Santa bowls. The gnomes are the pins. They are not taking it seriously.

A ten-frame bowling game set outdoors at Santa's Workshop, in the snow, with
reindeer judges and other critters wandering through. The whole game is one
file, `index.html` — plain JavaScript and canvas, no build step, no downloads,
no external images or sounds (the art is drawn in code and the audio is
synthesized).

## Version 2.0 (3D)

A 3D rebuild with real physics lives in [`v2/`](v2/) and is playable at
**https://brianonlbi.github.io/gnome-bowling/v2/**. This page describes 1.0, which
is unchanged. See [`v2/README.md`](v2/README.md).

## Share it as a link, not a file

Emailing `index.html` works badly: mail and antivirus programs flag any HTML
attachment as suspicious, and some mail apps try to open it in Google Drive
instead of a browser. Send people the **link** to the hosted game instead. Nothing to download, no warnings, works on every
device.

This repo is ready to host as-is (`index.html`, `manifest.webmanifest`,
`sw.js`, `icons/`). With GitHub Pages turned on (Settings → Pages → Deploy
from a branch → `main`, `/ (root)`) the address is
**https://brianonlbi.github.io/gnome-bowling/**

## Get the gnome icon

Once the game is on a website, anyone can install it from that link. It then
has its own gnome icon, opens full screen with no browser bars, and works
without internet.

- **iPhone / iPad** – open the link in Safari → Share button → **Add to Home Screen**.
- **Android** – open the link in Chrome → ⋮ menu → **Add to Home screen** / **Install app**.
- **Windows or Mac (Chrome or Edge)** – open the link → click the install icon at
  the right end of the address bar (or ⋮ menu → **Install Gnome Bowling**). A gnome
  icon appears on the desktop / Start menu / Launchpad; double-click it to play.
- **Mac (Safari)** – File → **Add to Dock**.

On a phone the game always fills the screen in landscape. If the phone is held
upright the game is drawn sideways, so just turn the phone.

## Play it from a file

Double-clicking `index.html` still works on any PC or Mac, offline. (The
install-with-icon feature needs the game to be on a website.)

**How a turn works**

1. **Position** – move Santa left/right (mouse, drag on touch, or ← →), then click.
2. **Aim** – an arrow slides left and right above the gnomes, pointing at where the ball will land. Click to lock it.
3. **Power** – the bar runs up and down. Top is full power, bottom is slow. Click to throw.

Stop the power bar **below 20%** and Santa bowls kiddie-style: both hands,
between the legs.

| | Easy | Hard |
|---|---|---|
| Arrow and power bar | slow | fast |
| Dotted aim guide | yes | no |

Controls: mouse or touch for everything, or keyboard — `←` `→` move, `Space`/`Enter`
select, `M` mute, `Esc` menu, `E`/`H` pick difficulty on the title screen.

Bowl three strikes in a row (a **turkey**) and Mrs. Claus serves dinner. Tap to
skip it. A perfect 300 gets something bigger.

Scoring is standard ten-pin (strikes, spares, three balls in the 10th). Best
score per difficulty is remembered in the browser.

## Put it on a website

Upload these files anywhere that serves static files, then either link to it
directly or embed it with an iframe. The game scales itself to fit whatever
box it is given and keeps a 3:2 shape:

```html
<div style="max-width:960px;margin:0 auto;aspect-ratio:3/2">
  <iframe src="https://brianonlbi.github.io/gnome-bowling/" title="Gnome Bowling"
          style="width:100%;height:100%;border:0" allow="autoplay" loading="lazy"></iframe>
</div>
```

Free hosting options that work with a small static folder: GitHub Pages (as above), Netlify Drop, or
Cloudflare Pages.

Sound starts on the first click or key press, because browsers block audio
until the player interacts with the page.

## Tweaking

Everything is near the top of the `<script>` in `index.html`:

- `SPEED` – arrow and power-bar speeds for each difficulty.
- `TAUNTS`, `SIGNS`, `SANTA_GRUMBLE` – what the gnomes (and Santa) say.
- `BM`, `KNOCK_T`, `DOWN_R`, `PFR`, `PP_E` – pin physics. Higher `KNOCK_T` or
  lower `DOWN_R` makes strikes harder.
- `randomAntic()` – which gnome antics happen and how many gnomes join in.
