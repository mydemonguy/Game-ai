#!/bin/sh
# Assemble Aetherfall (Phaser 3 build) into one offline page: game/aetherfall.html (browser) and the Android app's assets/index.html (fonts embedded)
set -e
cd "$(dirname "$0")"
python3 -c "import base64,json;m=json.load(open('sprites/dino.json'));m['src']='data:image/webp;base64,'+base64.b64encode(open('sprites/dino.webp','rb').read()).decode();open('sprites.gen.js','w').write('<script>const DINO='+json.dumps(m)+';</script>\n')"
{ cat shell.html; printf '<script>\n'; cat vendor/phaser-arcade-physics.min.js; printf '\n</script>\n'; cat sprites.gen.js 01_core.js 02_audio.js 03_art.js 04_textures.js 05_world.js 06_rooms.js 07_actors.js 08_fx.js 09_view_room.js 10_view_actors.js 11_hud.js 14_bossart.js 13_guardians.js 15_npc.js 16_arsenal.js 12_flow.js; } > aetherfall.html
python3 embed_fonts.py aetherfall.html ../app/src/main/assets/index.html
