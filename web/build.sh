#!/bin/sh
# Assemble the game into one HTML page: web/aetherfall.html (browser) and the Android app's assets/index.html (offline fonts)
cd "$(dirname "$0")"
python3 -c "import base64,json;m=json.load(open('sprites/dino.json'));m['src']='data:image/webp;base64,'+base64.b64encode(open('sprites/dino.webp','rb').read()).decode();open('sprites.gen.js','w').write('<script>const DINO='+json.dumps(m)+';</script>\n')"
cat p1.html sprites.gen.js p2.js p3.js p4a.js p4b.js p4c.js p4d.js p6.js p7.js p8a.js p8b.js p8c.js p9a.js p9b.js p11.js p5.js > aetherfall.html
python3 embed_fonts.py aetherfall.html ../app/src/main/assets/index.html
