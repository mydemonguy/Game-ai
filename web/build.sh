#!/bin/sh
# Assemble the game into one HTML page: web/aetherfall.html (browser) and the Android app's assets/index.html (offline fonts)
cd "$(dirname "$0")"
cat p1.html p2.js p3.js p4a.js p4b.js p5.js > aetherfall.html
python3 embed_fonts.py aetherfall.html ../app/src/main/assets/index.html
