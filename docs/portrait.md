# Pixel portrait

`src/assets/portrait.png` (128 x 128 px, 18 flat colours, dark outline) and `portrait-og.png` (the same, 4x, for the share card)
are generated from `~/Documents/Personal/Riju Dev Purkayastha-Photo.jpg`. The photo itself stays out of this repo.

1. `swift docs/ascii-seg.swift <photo> mask.png` cuts the person out with Apple's Vision framework.
2. `python3 -I docs/pixel-mk.py <photo> mask.png src/assets` writes both PNGs.

To swap in a drawn or generated pixel avatar, save it over those two files (square; 128 px and 512 px).
