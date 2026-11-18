# Daggerheart Resources: the table

A candlelit game table drawn with three.js. The two books on it are links to the
readers at `/resources/core-rulebook` and `/resources/hope-and-fear`.

## Putting it on daggerheart.highsodiumgaming.com

Serve this folder as static files (for a Next.js app, drop it in `public/table/`
and it is live at `/table/`). Nothing is fetched from other hosts: three.js and
the typefaces ship in `vendor/` and `fonts/`.

When the page runs on `*.highsodiumgaming.com` it changes three things by itself:

- the books use your real cover art from `/covers/core-rulebook.webp` and
  `/covers/hope-and-fear.webp`;
- a click plays the opening and then goes to the reader in the same tab;
- "High Sodium Gaming" goes to `/`.

Anywhere else (a local preview, a claude.ai artifact) it paints its own covers
and ends the opening with an "Open …" button that opens the live site in a new tab.

## What to edit

- `js/config.js`: the book list: titles, blurbs, page counts, links, cover
  paths, where each book lies on the table.
- `js/surfaces.js`: everything with words on it (covers, opened pages, GM
  screen, the note). Each one has an HTML builder and a 2D-canvas painter.
- `index.html`: the CSS for those HTML surfaces (the `.surf` rules) and the page chrome.
- `js/world.js`, `js/models.js`, `js/textures.js`: the table, lights, candles,
  miniatures, terrain, dice and procedural textures.
- `js/main.js`: camera, pointer, the opening sequence, bloom / depth of field.

## HTML-in-Canvas

Where the browser has HTML-in-Canvas (desktop Chrome and Edge, the Claude
desktop app) the covers, opened pages, GM screen and note are real DOM
elements inside the `<canvas>`, drawn into textures whenever they repaint, so
CSS animation, real text and the links' accessibility all carry into the 3D
scene. Everywhere else the same designs are painted with the 2D canvas API and
the scene is otherwise identical. The corner of the page says "Live HTML in
canvas" when the first path is running.

## Address flags for testing

Add after `#`, joined with `&`:

- `html=off` use the painted fallback even where HTML-in-Canvas exists
- `tier=lite` / `tier=full` force the phone or desktop quality tier
- `shot` skip the intro
- `open=core` or `open=hf` open a book on load; `p=0.6` freezes the opening there
- `dof=off`, `post=off` switch off depth of field / all post-processing

From the console: `__table.open('core')`, `__table.close()`.
