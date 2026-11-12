# Pixel portrait

`src/assets/portrait.png` (48 x 58 px, 20 colours) and `portrait-og.png` (the same, 9x, for the share card)
are generated from `~/Documents/Personal/Riju Dev Purkayastha-Photo.jpg`. The photo itself stays out of this repo.

1. `swift docs/ascii-seg.swift <photo> mask.png` cuts the person out with Apple's Vision framework.
2. `python3 -I docs/pixel-mk.py <photo> mask.png src/assets` writes both PNGs.
