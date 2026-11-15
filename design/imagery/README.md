# Imagery — round 2 (directions D, E, F)

`<D|E|F>/spec.json`: one entry per image: `id`, `board`, `width`, `height`, `prompt` (STYLE + CHARACTER blocks are already inlined), `use`, and where relevant `background` (key-out or blend colour) and `emitter_hint` (where the live salt pours from, as a fraction of width/height).

For the generator (RobBot):
- Save each result as `<D|E|F>/<id>.png` (or .webp) at the spec size. Keep the prompt and model in `<D|E|F>/LICENSES.md` (generated art, ours to use).
- `#FF00FF` backgrounds (d2-colossus-perched) are for keying out: a transparent PNG `<id>-cut.png` beside it helps.
- F's `#000000` hatchling is composited with screen blending: no keying needed.
- E2's flat colours must match the hex exactly (they melt into HTML panels); if the generator drifts, note the real hex.
- Reject any image with text, letters, faces of humans, a frame, or anything resembling Daggerheart art.
- If an emitter point moved in the result, note the real point in LICENSES.md; the board reads it from there.
