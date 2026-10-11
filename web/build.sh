#!/bin/sh
# Assemble the game into one HTML page: web/aetherfall.html (browser) and the Android app's assets/index.html (offline fonts)
cd "$(dirname "$0")"
python3 -c "import base64,json;m=json.load(open('sprites/dino.json'));m['src']='data:image/webp;base64,'+base64.b64encode(open('sprites/dino.webp','rb').read()).decode();open('sprites.gen.js','w').write('<script>const DINO='+json.dumps(m)+';</script>\n')"
cat p1.html sprites.gen.js p2.js p3.js p4a.js p4b.js p4c.js p5.js > aetherfall.html
python3 embed_fonts.py aetherfall.html ../app/src/main/assets/index.html
