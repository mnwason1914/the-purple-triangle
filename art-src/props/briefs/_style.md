You are producing art for real 3D furniture in a first-person pixel-art game set in a small mountain village in Silesia, Germany, on 29 June 1933 (the home and bicycle-repair workshop of a poor working family). Each piece of furniture is built in the game as a box, and your images are pasted onto its faces, so every image must be a FLAT ORTHOGRAPHIC VIEW of one face. Use your built-in image generation tool.

STYLE FOR EVERY IMAGE
- 16-bit era pixel art: visible square pixels, crisp edges, no blur, no anti-aliasing, no painterly gradients.
- Muted, earthy, warm palette (browns, greys, off-whites, dull greens and blues), worn and used, historically plausible 1930s rural German objects. Even, flat front lighting, no cast shadows.
- No text, letters, numbers, logos, signatures, watermarks anywhere. No people, no hands.
- Do not draw a swastika or any political symbol.

VIEWS (very important)
- "front" = a straight-on front elevation: the camera looks exactly perpendicular at the front; you must NOT see the top or the sides at all; no perspective, no vanishing lines, no tilt.
- "side" = a straight-on side elevation of the same object (same height, same style, same colours), again no perspective.
- "top" = looking straight down at the top surface (plan view); the top surface fills the WHOLE image edge to edge, no background visible.
- In front and side views the object must touch the left, right and bottom edges of its own silhouette area naturally; the background everywhere around the object AND in every opening (between legs, under shelves, between spokes, between rungs) is ONE flat solid magenta #FF00FF. Never use magenta or pink inside the object. No floor line, no shadow on the background, no border.
- Views of the same object must match each other exactly in height, materials, colours and details.

SAVING (very important)
- After EACH image is generated, immediately copy the PNG from where the tool saved it (under ~/.codex/generated_images/...) to ./art-src/props/raw/<name>.png using the exact name given. Do not rename, resize or edit the files yourself.
- Do not modify any other file in the repository.
- Copy ONLY the file your image tool produced for that exact request in this run. Copy it only after the image tool call has returned, and before copying check (with md5) that the new file differs from every PNG already in ./art-src/props/raw; if it matches one, the newest file is not ready yet: wait a few seconds and look again. Never copy the same picture under two names. If a generation fails, report the name as FAILED.
- If an image clearly ignores the view rules (perspective, visible top in a front view, text), regenerate it once.
- Never pass an existing image to the image tool and never write image data yourself. For the second and third view of an object, repeat its description word for word and change only the view.
- At the end, reply with a list: name → saved path (or FAILED and why).
