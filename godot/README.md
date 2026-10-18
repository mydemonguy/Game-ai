# Aetherfall · Godot 4 edition

Aetherfall rebuilt in **Godot 4.6** (GDScript, Compatibility renderer, 2D). This is the whole game: six worlds, sixty rooms, five shrine guardians, Malakar, Claude, Sable, relics, Guardian Arms and Boss Rush, plus same-Wi-Fi co-op where a friend joins as Zeph the raptor or Rook the triceratops.

## Open it in Godot on your phone
1. Download `Aetherfall-Godot-project.zip` from the latest **godot-…** release.
2. In the Godot 4 app: **Project Manager → Import**, pick the zip, choose a folder, then **Import & Edit**.
3. The first import takes a minute (about 400 images and sounds). Press ▶ to play.

## Layout
- `scripts/g0_base.gd` … `g4_main.gd`: one chain of scripts (each extends the previous): shared state → rooms and collision → actors and AI → visuals → HUD, menus and the game loop.
- `scripts/g5_net.gd`: co-op (ENet on port 47890, LAN discovery on 47891).
- `scripts/pad.gd`: touch controls. `scripts/db.gd`: data and texture cache. `scripts/sfx.gd`: sound and music.
- `data/rooms.json`, `data/text.json`: the room layouts and all story text.
- `assets/`: art baked from the original game (`tools/export_godot.py` regenerates it), music, sound effects and fonts.

## Credits
Music by Tanner Helland (CC BY 4.0). Sound effects by Kenney (CC0) and synthesised for Aetherfall. Fonts: Cinzel and Chakra Petch (SIL OFL). Tyko, Zeph and Rook sprites supplied by the project owner.
