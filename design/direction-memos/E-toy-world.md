# E — Toy World: Sal the salt-shaker monster

**Idea.** Game night as a tiny 3D toy world. A chunky vinyl-toy salt-shaker monster, Sal, lives on the tabletop among giant dice and a salt mine, and salts everything, including our title. Fun, bright, collectable (refs steer-1/03 and 04).

**Signature.** Sal: a glass salt shaker with a chrome-cap helmet, big glossy eyes, sky-blue stubby limbs and two tiny salt-cube horns. It's a mascot you could make into a real vinyl toy; it can only belong to a brand called High Sodium.

**Hero art.** Generated glossy 3D renders (`imagery/E/spec.json`). E1: full diorama `e1-diorama-wide` / `e1-diorama-tall`. E2: Sal cut-outs on exact panel colours (`e2-sal-pour` on #FFC93C, `e2-sal-reading` on #4FB3E8, `e2-sal-wave` on #FF7A66) so each image melts into its HTML colour panel.

**Interactive salt.** Shared engine, chunky grains (cell 4px, bright white #FFFFFF / #F4F1EA / #E9E4D8). Emitter at Sal's cap. Salt piles on the giant condensed wordmark and on top of the 3D keycap button; tap anywhere and Sal shakes again (the image gets a 300 ms CSS wiggle on tap).

**Type.** Wordmark: Lilita One (OFL) huge, white with a chunky 3D extruded shadow in the panel's darker shade (CSS text-shadow stack). Step/section labels: Anton (OFL) condensed caps, like refs 03/04. UI/body: Nunito (OFL).

**Palette (each tied to an object in the renders).**
| Hex | Role |
| --- | --- |
| #FFC93C | sunflower dice yellow: E2 hero panel, Core cover panel |
| #FF7A66 | coral tablecloth: E1 ground, secondary panel |
| #4FB3E8 | sky-blue vinyl: Hope & Fear panel, links |
| #2B2350 | deep ink purple: text on panels, viewer chrome |
| #FFFFFF | salt white: wordmark, grains |
| #1F7A5C | felt green: focus ring, search match underline |

**Button.** A chunky 3D keycap (ref 04's key button): ink-purple top face, darker side walls, "RESOURCES ↵" label; pressing sinks it 6 px; salt piles on its top face.

**Boards (axis: whole rendered world vs character on bold colour).**
- **E1 salt-mine-diorama**: the full tabletop diorama is the hero; giant white condensed wordmark bottom-left over the flat tablecloth area (Granola layout, but our structure keeps the button on the axis on phone).
- **E2 sal-on-colour**: no scene: one huge sunflower panel, Sal jumping out of it pouring salt onto the wordmark; /resources becomes bold colour step-cards (yellow Core, blue Hope & Fear) with Sal reading.

**/resources.** E1: toy covers (`e-cover-core`, `e-cover-hope-fear`) sitting on the coral tablecloth with salt piles. E2: two big colour panels with the covers, Sal reading on the blue panel.
**Viewer.** Deep ink-purple chrome, page brightest; Sal waving is the "no results" state; the active thumbnail gets a yellow chunky outline.

**Motion.** (1) Salt pour from Sal's cap on load, 2 s: tells the name. (2) Scatter/tap-to-shake with a Sal wiggle: the toy reacts to you. (3) Keycap press depth on hover/press: makes the one action feel physical. Reduced motion: static settled salt, no wiggle, button has colour change only.

**References.** steer-1/03 (3D vinyl characters breaking bold panels), steer-1/04 (toy-world diorama hero, keycap button, condensed caps title), R07 (covers carry the colour), R13/R16/R17 (phone sheet and grid).

**Not in the excluded family** because the art is a rendered world and a character, colourful and playful.
**Never.** Human figures with faces; Daggerheart art or logo; stock photos; busy multi-section marketing scroll.
