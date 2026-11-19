You are producing the on-screen interface art (buttons, panels, icons) for a first-person pixel-art game set in a small mountain village in Silesia, Germany, in June 1933. Use your built-in image generation tool.

STYLE FOR EVERY IMAGE
- 16-bit era pixel art: visible square pixels, crisp edges, no blur, no anti-aliasing, no soft gradients, no glow.
- Materials of the period: dark worn walnut wood, aged cream paper, tarnished brass rivets and rims, dark iron. Muted earthy palette (dark browns, cream, dull brass, charcoal). The only accent colour is a muted violet-purple (#7a4aa8), used sparingly.
- ABSOLUTELY NO text, letters, numbers, arrows-with-letters, logos, signatures or watermarks anywhere.
- Each image is ONE single object, centred, filling most of the frame, seen straight from the front (flat, no perspective, no tilt, no drop shadow).
- Background: ONE flat solid magenta #FF00FF everywhere around the object (no gradient, no floor, no border). Never use magenta or pink inside the object.
- Panels and button plates must have a plain, evenly coloured, flat centre area (so text can be printed on it later and the plate can be stretched): all decoration stays within a thin border band at the edges, and the four corners are decorated identically.
- Pairs marked "pressed" must be the identical object, same size and position, only darker / pushed in as described.

SAVING (very important)
- After EACH image is generated, immediately copy the PNG from where the tool saved it (under ~/.codex/generated_images/...) to ./art-src/ui/raw/<name>.png using the exact name given. Do not rename, resize or edit the files yourself.
- Do not modify any other file in the repository.
- Copy ONLY the file your image tool produced for that exact request in this run. If a generation fails, report the name as FAILED.
- If an image clearly ignores the request (text appears, several objects, perspective), regenerate it once.
- Never pass an existing image to the image tool and never write image data yourself.
- At the end, reply with a list: name → saved path (or FAILED and why).
