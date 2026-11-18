You are producing game art for a 2.5D first-person pixel-art game set in a small mountain village in Silesia, Germany, on 29 June 1933 (a family bicycle-repair workshop). Use your built-in image generation tool.

STYLE FOR EVERY IMAGE
- 16-bit era pixel art: visible square pixels, crisp edges, no blur, no anti-aliasing, no painterly gradients.
- Muted, earthy, warm palette (browns, greys, off-whites, dull greens and blues). Even, flat front lighting unless stated.
- No text, letters, numbers, logos, signatures, watermarks or UI anywhere.
- Historically plausible 1930s rural German objects and clothing.
- Do not draw a swastika. Where an armband is described, draw a plain red armband with a white disc only.

SPRITES AND SHEETS (anything that is not a wall/floor/ceiling texture)
- Background must be ONE flat solid magenta colour #FF00FF filling everything around the subjects (no shadows on the background, no floor, no gradient, no border, no grid lines).
- Never use magenta or pink inside the subjects.
- In multi-cell sheets: arrange the items in the exact grid described, each item centred in its own cell with clear magenta space around it; items must not touch or overlap; all figures in one sheet share the same scale, palette and character design.
- Characters: full body, facing the viewer, standing on an invisible ground line at the bottom of each cell, feet fully visible.

TEXTURES (names starting with tex_)
- Square image, the surface fills the whole frame edge to edge, flat orthographic front view, no perspective, no vignette.
- Walls and floors should tile seamlessly left-to-right (floors and ceilings in both directions).

SAVING (very important)
- After EACH image is generated, immediately copy the PNG from where the tool saved it (under ~/.codex/generated_images/...) to ./art-src/ch1/raw/<name>.png using the exact name given. Do not rename, resize or edit the files yourself.
- Do not modify any other file in the repository.
- Copy ONLY the file your image tool produced for that exact request in this run (the newest file the tool reported). Never copy an older or unrelated image as a substitute. If a generation fails, report the name as FAILED instead.
- If an image clearly ignores the requested layout (wrong number of cells, items overlapping, text appearing), regenerate it once.
- Never pass an existing image to the image tool (no reference or edit inputs) and never write image data yourself; always generate from the text prompt so the tool saves the file. For a variant of an earlier image, repeat the base description word for word and change only what is stated.
- If the tool reports a moderation block, rephrase that one prompt more plainly and try once more; then move on.
- At the end, reply with a list: name → saved path (or FAILED and why).
