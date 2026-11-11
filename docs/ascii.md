# ASCII portrait

`src/data/portrait.ts` is generated from `~/Documents/Personal/Riju Dev Purkayastha-Photo.jpg` (kept out of this repo).

1. `swift docs/ascii-seg.swift <photo> mask.png` cuts the person out with Apple's Vision framework.
2. `python3 -I docs/ascii-mk.py <photo>` (run next to mask.png) writes ascii.json; the "light" mapping (darker = denser) is the one used.
