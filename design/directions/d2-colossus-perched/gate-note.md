# d2-colossus-perched — gate note

**What:** a quiet painted salt flat at dusk. A small cut-out Colossus sits on top of HIGH and tips its salt crystal, and the live salt runs down through the letters onto the RESOURCES plaque.
**Axis value:** monster as a small character on the type.
**Signature test:** "Bean There Café" with a salt golem sitting on it means nothing. Fails = pass.
**Exclude check:** a character physically interacting with the name, over a painted world. No ornament device anywhere.
**Strongest part:** it is charming and readable at 390. The creature, the name and the pour line up in one vertical column (golem, HIGH, SODIUM, GAMING, plaque), and the vista stays calm behind them. It is funnier than D1 and the mascot is easier to reuse (the same cut-out sits on the Hope & Fear cover on /resources).
**Real risk:** small and cute is less epic. Against the covers' huge painted energy this reads as a mascot on a backdrop, not a scene. The gold backlight behind the creature helps but does not close the gap.
**Cut-out edge (asked to check):** a magenta fringe is visible on the raw PNG (about 1,500 pinkish edge pixels). Hidden with an SVG filter (#defringe): an alpha threshold plus a 1px erode, then a drop shadow. At 1440 and 390 no pink is visible. **Residual:** the keyed PNG also holds a faint translucent haze box around the creature. The threshold reduces it, but a light rectangle can still be seen against the dark sky on phone (board-390-first.png, around the golem). It needs a clean re-key, or the matte regenerated, before build. I also clipped the PNG at 87% height to drop the loosely painted falling grains, so the live salt takes over.
**Weak image (honest):** this is the same blocky "Minecraft" golem (LICENSES.md). At this small size the blockiness reads as cute rather than wrong, which is why this board copes with it better than D1. d2-vista-wide and -tall are good paintings.
**Note vs memo:** the memo has its legs dangling over "SODIUM". The cut-out has no dangling legs (it sits squat), so it sits on the top line, HIGH, centred, which also keeps the pour column central for the plaque.
**Fonts:** Cinzel Decorative 900, DM Serif Display, Alegreya Sans (OFL, Google Fonts).
**Salt:** cell 3 phone / 4 desktop; maxGrains 6000 / 14000; rate 240 / 420 per s for 2.8 s; prefill 450 / 1100; glyphBridge -0.07. The emitter is an anchor inside the cut-out at (50.5%, 83%) of its box, under the tipped crystal, so it follows the creature at every size. Shared engine unchanged.
**Resources:** as D1 without the sample shelf: real covers, salt dusting, perched Colossus on Hope & Fear, "Alt covers (ours)" strip.
**Viewer:** identical to D1 (same direction).
**Detect:** same kept items and reasons as D1 (dark legibility shadow and scrim, placeholder page lines, flush tab and phone edges); the meta tracking is fixed.
